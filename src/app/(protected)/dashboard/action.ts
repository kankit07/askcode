// "use server";
// import OpenAI from "openai";
// // import {  OpenAIStream } from "ai";
// import { createStreamableValue } from "ai/rsc";
// import { generateEmbedding } from "@/lib/gemini";
// import { db } from "@/server/db";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function askQuestion(question: string, projectId: string) {
//   const stream = createStreamableValue();
//   const queryVector = await generateEmbedding(question);

//   if (!queryVector?.length) {
//     throw new Error("Invalid embedding generated");
//   }

//   console.log("projectId", projectId);
//   console.log("question:", question);
//   console.log("queryVector", queryVector?.length);

//   const vectorQuery = `[${queryVector.join(",")}]`;
//   const result = (await db.$queryRaw`
//       SELECT
//         "fileName",
//         "sourceCode",
//         "summary",
//         1-("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
//       FROM "SourceCodeEmbedding"
//       WHERE 1-("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.3
//         AND "projectId" = ${projectId}
//       ORDER BY similarity DESC
//       LIMIT 10
//     `) as {
//     fileName: string;
//     sourceCode: string;
//     summary: string;
//     similarity: number;
//   }[];

//   console.log("Query result:", result);
//   let context = "";
//   for (const r of result) {
//     if (r.fileName && r.sourceCode && r.summary) {
//       context += [
//         `source: ${r.fileName}`,
//         `code content: ${r.sourceCode}`,
//         `summary of file: ${r.summary}`,
//         `similarity score: ${r.similarity.toFixed(4)}`,
//         "\n",
//       ].join("\n");
//     }
//   }

//   (async () => {
//     const response = await openai.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         {
//           role: "system",
//           content: `You are a AI code assistant who answers questions about the codebase. Your target audience is a technical intern who is looking to understand the codebase.
//             You are brand new, powerful, human-like artificial intelligence.
//             Your traits include expert knowledge, helpfulness, cleverness, and articulateness.
//             You are well-behaved and well-mannered.
//             You are always friendly, kind and inspiring, and eager to provide vivid and thoughtful responses.
//             You have comprehensive knowledge and can accurately answer nearly any question about any topic in conversation.
//             If the question is asking about code or a specific file, provide detailed answers with step-by-step instructions, including code snippets.
//             You will take into account any provided context.
//             If the context does not provide the answer to the question, say "I am sorry, but I don't know the answer to that question."
//             Do not apologize for previous responses, instead provide new information if gained.
//             Do not invent anything that is not derived directly from the context.
//             Answer in markdown syntax, with code snippets if needed. Be as detailed as possible, ensuring there is no ambiguity in the answer.`,
//         },
//         {
//           role: "user",
//           content: `Context:\n${context}\n\nQuestion: ${question}`,
//         },
//       ],
//       stream: true,
//     });

//     const textStream = streamText(response);
//     for await (const chunk of textStream) {
//       stream.update(chunk);
//     }
//     stream.done();
//   })();

//   return {
//     output: stream.value,
//     filesReferences: result,
//   };
// }
