"use server";

import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

import {
  ANSWER_SYSTEM_PROMPT,
  answerModels,
  shouldTryNextModel,
  describeAiError,
  generateEmbedding,
  toVectorLiteral,
} from "@/lib/ai";
import { type FileReference } from "@/lib/file-reference";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { findProjectForUser } from "@/server/project-access";

const MIN_SIMILARITY = 0.3;
const MAX_REFERENCES = 8;
const MAX_QUESTION_CHARS = 2_000;

export type AskQuestionResult =
  | {
      ok: true;
      answer: ReturnType<typeof createStreamableValue<string>>["value"];
      /** Resolves to an error message if the answer failed part-way. */
      error: ReturnType<
        typeof createStreamableValue<string | undefined>
      >["value"];
      fileReferences: FileReference[];
    }
  | { ok: false; error: string };

export async function askQuestion(
  question: string,
  projectId: string,
): Promise<AskQuestionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in again." };

  const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS);
  if (!trimmed) return { ok: false, error: "Type a question first." };

  const project = await findProjectForUser(projectId, session.user.id);
  if (!project) return { ok: false, error: "Project not found." };
  if (project.status !== "READY") {
    return {
      ok: false,
      error: "This project is still being indexed. Try again in a minute.",
    };
  }

  let fileReferences: FileReference[];
  try {
    const vector = toVectorLiteral(await generateEmbedding(trimmed));
    fileReferences = await db.$queryRaw<FileReference[]>`
      SELECT
        "fileName",
        "sourceCode",
        "summary",
        1 - ("summaryEmbedding" <=> ${vector}::vector) AS similarity
      FROM "SourceCodeEmbedding"
      WHERE "projectId" = ${projectId}
        AND "summaryEmbedding" IS NOT NULL
        AND 1 - ("summaryEmbedding" <=> ${vector}::vector) > ${MIN_SIMILARITY}
      ORDER BY similarity DESC
      LIMIT ${MAX_REFERENCES}
    `;
  } catch (error) {
    console.error("Retrieval failed", error);
    return { ok: false, error: describeAiError(error) };
  }

  const context = fileReferences
    .map(
      (file) =>
        `<file path="${file.fileName}">\n<summary>${file.summary}</summary>\n<code>\n${file.sourceCode}\n</code>\n</file>`,
    )
    .join("\n\n");

  const stream = createStreamableValue("");
  const failure = createStreamableValue<string | undefined>(undefined);

  // Stream in the background so the client gets the references immediately
  // and renders the answer token by token.
  void (async () => {
    let streamError: unknown;
    let received = 0;
    const prompt = `Source files from the "${project.name}" repository:\n\n${context || "(no relevant files found)"}\n\nQuestion: ${trimmed}`;

    for (const model of answerModels) {
      streamError = undefined;
      try {
        const { textStream } = streamText({
          model,
          system: ANSWER_SYSTEM_PROMPT,
          prompt,
          maxRetries: 1,
          // streamText reports provider errors here instead of throwing.
          onError: ({ error }) => {
            streamError = error;
          },
        });
        for await (const delta of textStream) {
          received += delta.length;
          stream.append(delta);
        }
      } catch (error) {
        streamError = error;
      }
      // Only switch models if nothing has been shown yet.
      if (!streamError || received > 0 || !shouldTryNextModel(streamError)) {
        break;
      }
      console.warn(`Gemini model ${model.modelId} failed, trying next`);
    }
    if (streamError) console.error("Answer stream failed", streamError);
    if (streamError || received === 0) {
      failure.done(describeAiError(streamError));
    } else {
      failure.done();
    }
    stream.done();
  })();

  return {
    ok: true,
    answer: stream.value,
    error: failure.value,
    fileReferences,
  };
}
