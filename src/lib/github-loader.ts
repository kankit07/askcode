import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import type { Document } from "@langchain/core/documents";
// import { generateEmbedding, summarizeCode } from "./gemini";
import { generateEmbedding, summarizeCode } from "./llama";
import { db } from "@/server/db";

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken,
    branch: "main",
    recursive: true,
    ignoreFiles: ["node modules, package-lock.json, yarn.lock, "],
    unknown: "warn",
    maxConcurrency: 5,
  });
  const docs = await loader.load();
  return docs;
};

// console.log(await loadGithubRepo("https://github.com/kankit07/exercise_DB"));
// function to generate embeddings of the documents
const generateEmbeddings = async (docs: Document[]) => {
  return await Promise.all(
    docs.map(async (doc) => {
      try {
        const summary = await summarizeCode([doc]);
        if (!summary) {
          console.log("no summary found for", doc.metadata.source);
          return null;
        }
        const embedding = await generateEmbedding(summary);
        return {
          summary,
          embedding,
          sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
          fileName: doc.metadata.source,
        };
      } catch (error) {
        console.log("error in generateEmbeddings", error);
        return null;
      }
    }),
  );
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGithubRepo(githubUrl, githubToken);
  // console.log(docs);
  const allEmbeddings = await generateEmbeddings(docs);
  // console.log("linr-47,github-loader");
  await Promise.allSettled(
    allEmbeddings.map(async (embedding, index) => {
      // console.log(`processing ${index} of ${allEmbeddings.length}`);
      if (!embedding) return;

      const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
        data: {
          summary: embedding.summary,
          sourceCode: embedding.sourceCode,
          fileName: embedding.fileName,
          projectId,
        },
      });
      await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding} :: vector
        WHERE "id" = ${sourceCodeEmbedding.id}`;
    }),
  );
  // return docs;
};
// const githubUrl = "https://github.com/ljivesh/LegalAdvisor";
// const githubToken = process.env.GITHUB_TOKEN;
// console.log(await indexGithubRepo(githubUrl));
