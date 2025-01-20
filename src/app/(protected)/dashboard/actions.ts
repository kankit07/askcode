"use server";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateEmbedding } from "@/lib/gemini";

import { db } from "@/server/db";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue();
  const queryVector = await generateEmbedding(question);
  // const vectorQuery = `[${queryVector.join(",")}]`;
  // const result = (await db.$queryRaw`
  //   SELECT "fileName", "sourceCode", "summary",
  //   1-("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
  //   FROM "SourceCodeEmbedding"
  //   WHERE 1-("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
  //   AND "projectId" = ${projectId}
  //   ORDER BY similarity DESC
  //   LIMIT 10
  //   `) as { fileName: string; sourceCode: string; summary: string }[];
  // let context = "";
  // console.log("-----result-----", result);
  // for (const r of result) {
  //   context += `source: ${r.fileName}\n code content: ${r.sourceCode}\n summary of file: ${r.summary}\n\n`;
  // }
  // console.log("projectId", projectId);
  // console.log("question:", question);
  if (!queryVector?.length) {
    throw new Error("Invalid embedding generated");
  }
  // console.log("queryVector", queryVector?.length);
  const vectorQuery = `[${queryVector.join(",")}]`;
  const result = (await db.$queryRaw`
      SELECT
        "fileName",
        "sourceCode",
        "summary",
        1-("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
      FROM "SourceCodeEmbedding"
      WHERE 1-("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.2
        AND "projectId" = ${projectId}
      ORDER BY similarity DESC
      LIMIT 10
    `) as {
    fileName: string;
    sourceCode: string;
    summary: string;
    similarity: number;
  }[];

  // console.log("Query result:", result);
  let context = "";
  for (const r of result) {
    if (r.fileName && r.sourceCode && r.summary) {
      context += [
        `source: ${r.fileName}`,
        `code content: ${r.sourceCode}`,
        `summary of file: ${r.summary}`,
        `similarity score: ${r.similarity.toFixed(4)}`,
        "\n",
      ].join("\n");
    }
  }
  // (async () => {
  //   const { textStream } = await streamText({
  //     model: google("gemini-1.5-flash"),
  //     prompt: `You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern who is looking to understand the codebase:
  //               AI assistant is brand new, powerful, human-like artificial intelligience.
  //               The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
  //               AI is a well-behaved and well-manered individual.
  //               AI is always friendly, kind an inspiring, and he is eager to provide vivid and thoughtful response to the user.
  //               AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
  //               If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions, including code snipets.
  //               START CONTEXT BLOCK
  //               ${context}
  //               END CONTEXT BLOCK

  //               START QUESTION BLOCK
  //               ${question}
  //               END QUESTION BLOCK
  //               AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
  //               If the context does not provide the answer to the question, the AI assiatant will say,"I am sorry, but I don't know the answer to that question."
  //               AI assistant will not apologize for previous responses, but instead will provide new information was gained.
  //               AI assistant will not invnet anyting that is not derivied directly from the context.
  //               Answer in markdown syntax, with code snippets if needed. Be as detailed as possible when answering, make sure there is no ambiguity in the answer.
  //             `,
  //   });
  //   for await (const text of textStream) {
  //     stream.update(text);
  //   }
  //   stream.done();
  // })();
  (async () => {
    const prompt = `You are an expert code assistant who helps developers understand codebases.

  ## Response Guidelines
  - Always provide detailed, clear explanations
  - Use markdown formatting for structured responses
  - Include relevant code snippets with proper syntax highlighting
  - Break down complex concepts into digestible steps
  - Focus on practical understanding and implementation details

  ## Context Information
  \`\`\`
  ${context}
  \`\`\`

  ## Question
  ${question}

  ## Response Parameters
  - Only provide information directly supported by the context
  - If information is not available in the context, clearly state: "Based on the provided context, I cannot answer this question"
  - Do not make assumptions about implementation details not shown in the context
  - Focus on explaining "how" and "why" aspects of the code
  - Include examples when relevant to clarify concepts`;

    try {
      const { textStream } = await streamText({
        model: google("gemini-1.5-flash"),
        prompt: prompt,
        // temperature: 0.7, // Added for more focused responses
        // maxTokens: 1500, // Increased for detailed explanations
      });

      for await (const text of textStream) {
        try {
          stream.update(text);
        } catch (streamError) {
          console.error("Error updating stream:", streamError);
        }
      }

      stream.done();
    } catch (error) {
      console.error("Stream processing error:", error);
      stream.done();
    }
  })();
  return {
    output: stream.value,
    filesReferences: result,
  };
}
