import "server-only";

import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";

import { env } from "@/env";
import {
  describeAiError,
  generateEmbedding,
  summarizeFile,
  toVectorLiteral,
} from "@/lib/ai";
import { mapWithConcurrency } from "@/lib/concurrency";
import { getRepoInfo, parseGithubUrl, syncCommits } from "@/lib/github";
import { db } from "@/server/db";

// gitignore-style patterns for files that are noise for Q&A.
const IGNORED_FILES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  "out/",
  "coverage/",
  "vendor/",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "*.min.js",
  "*.map",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.ico",
  "*.svg",
  "*.pdf",
  "*.zip",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.mp4",
  "*.mp3",
];

const MAX_FILES = 300;
const CONCURRENCY = 4;

async function loadRepoFiles(
  githubUrl: string,
  branch: string,
  token?: string,
) {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: token ?? env.GITHUB_TOKEN,
    branch,
    recursive: true,
    ignoreFiles: IGNORED_FILES,
    unknown: "warn",
    maxConcurrency: 5,
  });
  const docs = await loader.load();
  return docs
    .filter((doc) => doc.pageContent.trim().length > 0)
    .slice(0, MAX_FILES)
    .map((doc) => ({
      fileName: String(doc.metadata.source),
      sourceCode: doc.pageContent,
    }));
}

async function indexFile(
  projectId: string,
  file: { fileName: string; sourceCode: string },
) {
  const summary = await summarizeFile(file.fileName, file.sourceCode);
  if (!summary) return;
  const embedding = await generateEmbedding(summary);
  const row = await db.sourceCodeEmbedding.create({
    data: { projectId, summary, ...file },
    select: { id: true },
  });
  await db.$executeRaw`
    UPDATE "SourceCodeEmbedding"
    SET "summaryEmbedding" = ${toVectorLiteral(embedding)}::vector
    WHERE "id" = ${row.id}`;
}

/**
 * Indexes a repository and syncs its recent commits. Runs in the background
 * after the project is created; progress is written to the Project row so the
 * dashboard can show it.
 */
export async function indexProject(projectId: string, token?: string) {
  try {
    const project = await db.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    const ref = parseGithubUrl(project.githubUrl);
    if (!ref) throw new Error("Invalid GitHub repository URL");

    const { defaultBranch } = await getRepoInfo(ref, token);
    const files = await loadRepoFiles(project.githubUrl, defaultBranch, token);
    if (files.length === 0) throw new Error("No indexable files found");

    await db.project.update({
      where: { id: projectId },
      data: { totalFiles: files.length, indexedFiles: 0, indexError: null },
    });

    let failed = 0;
    let lastError: unknown;
    await mapWithConcurrency(files, CONCURRENCY, async (file) => {
      try {
        await indexFile(projectId, file);
      } catch (error) {
        failed++;
        lastError = error;
        console.error(`Failed to index ${file.fileName}`, error);
      }
      await db.project.update({
        where: { id: projectId },
        data: { indexedFiles: { increment: 1 } },
      });
    });

    if (failed === files.length) {
      throw new Error(
        `No files could be indexed. ${describeAiError(lastError)}`,
      );
    }

    // Commit summaries are nice to have; don't fail the project over them.
    await syncCommits(projectId, token).catch((error) =>
      console.error("Initial commit sync failed", error),
    );

    await db.project.update({
      where: { id: projectId },
      data: { status: "READY" },
    });
  } catch (error) {
    console.error(`Indexing project ${projectId} failed`, error);
    await db.project.update({
      where: { id: projectId },
      data: {
        status: "FAILED",
        indexError: error instanceof Error ? error.message : "Indexing failed",
      },
    });
  }
}
