import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, generateText, type LanguageModel } from "ai";

import { env } from "@/env";

export const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

/**
 * Model lists, in order of preference. When one is overloaded, out of quota or
 * retired we move on to the next. Each model has its own free-tier quota, so a
 * longer list also stretches how far a free API key goes.
 */
// Answers: few calls, quality matters most.
const DEFAULT_ANSWER_MODELS =
  "gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-flash-lite-latest";
// File and commit summaries: one call per file while indexing, so use lite models.
const DEFAULT_SUMMARY_MODELS =
  "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest";

function modelList(ids: string): LanguageModel[] {
  return [
    ...new Set(
      ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].map((id) => google(id));
}

export const answerModels = modelList(
  env.GEMINI_MODELS ?? DEFAULT_ANSWER_MODELS,
);
const summaryModels = modelList(
  env.GEMINI_SUMMARY_MODELS ?? DEFAULT_SUMMARY_MODELS,
);

/** Errors where trying a different model might succeed. */
export function shouldTryNextModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /high demand|overloaded|503|unavailable|no longer available|not found|404|429|RESOURCE_EXHAUSTED|quota/i.test(
    message,
  );
}

/** Must match the `vector(768)` column in prisma/schema.prisma. */
export const EMBEDDING_DIMENSIONS = 768;
const embeddingModel = google.textEmbeddingModel("gemini-embedding-001", {
  outputDimensionality: EMBEDDING_DIMENSIONS,
});

/** Retries per model before falling back to the next one. */
const RETRIES_PER_MODEL = 2;

async function generateWithFallback(
  options: Omit<Parameters<typeof generateText>[0], "model" | "maxRetries">,
) {
  let lastError: unknown;
  for (const model of summaryModels) {
    try {
      return await generateText({
        ...options,
        model,
        maxRetries: RETRIES_PER_MODEL,
      });
    } catch (error) {
      lastError = error;
      if (!shouldTryNextModel(error)) break;
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `Gemini model ${model.modelId} failed, trying next: ${reason}`,
      );
    }
  }
  throw lastError;
}

const MAX_FILE_CHARS = 10_000;
const MAX_DIFF_CHARS = 40_000;

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    maxRetries: 4,
  });
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding.length}`,
    );
  }
  return embedding;
}

/** Formats an embedding as a pgvector literal, e.g. `[0.1,0.2]`. */
export function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

export async function summarizeFile(fileName: string, code: string) {
  const { text } = await generateWithFallback({
    system:
      "You write short technical summaries of source files for a code search index. State what the file is for, what it exports and how it fits into the project, using the real names from the code. Write the summary directly: no greeting, no preamble, no advice to the reader.",
    prompt: `File: ${fileName}\n---\n${code.slice(0, MAX_FILE_CHARS)}\n---\nSummarize this file in no more than 100 words.`,
  });
  return text.trim();
}

export async function summarizeCommitDiff(diff: string) {
  const { text } = await generateWithFallback({
    system: `You summarize git diffs for a commit log.
Lines starting with "+" were added, lines starting with "-" were removed, other lines are context.
Reply with a short markdown bullet list (at most 5 bullets). Each bullet describes one change and, when only one or two files are involved, ends with the file paths in square brackets, e.g.:
* Raised the page size from \`10\` to \`100\` [server/recordings.ts]
* Moved Octokit setup into its own module [src/octokit.ts], [src/index.ts]
Do not repeat these examples.`,
    prompt: diff.slice(0, MAX_DIFF_CHARS),
  });
  return text.trim();
}

export const ANSWER_SYSTEM_PROMPT = `You are AskCode, an expert assistant that helps developers understand a codebase.

Rules:
- Answer only from the provided source files. If they don't contain the answer, say so plainly and suggest what to look for instead.
- Reference files by their path, formatted as inline code.
- Use markdown. Include short code snippets when they help, with a language tag.
- Explain the "how" and the "why", step by step when the question is about changing something.
- Never invent functions, files or behaviour that are not in the context.`;

/** Turns a Gemini/AI SDK error into something we can show a user. */
export function describeAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/high demand|overloaded|503|unavailable/i.test(message)) {
    return "Gemini is busy right now. Please try again in a minute.";
  }
  if (/quota|rate limit|429|RESOURCE_EXHAUSTED/i.test(message)) {
    return "Gemini rate limit reached. Wait a moment and try again.";
  }
  if (/API key|PERMISSION_DENIED|401|403/i.test(message)) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY.";
  }
  if (/no longer available|not found|404/i.test(message)) {
    return "The configured Gemini models aren't available. Update GEMINI_MODELS.";
  }
  return "The AI request failed. Please try again.";
}
