import "server-only";

import { Octokit } from "octokit";

import { env } from "@/env";
import { summarizeCommitDiff } from "@/lib/ai";
import { mapWithConcurrency } from "@/lib/concurrency";
import { db } from "@/server/db";

const COMMITS_TO_TRACK = 15;

export type RepoRef = { owner: string; repo: string };

/**
 * Accepts `https://github.com/owner/repo`, with or without `www.`, a trailing
 * slash, a `.git` suffix or extra path segments like `/tree/main`.
 */
export function parseGithubUrl(url: string): RepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!["github.com", "www.github.com"].includes(parsed.hostname)) return null;
  const [owner, rawRepo] = parsed.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

/** Canonical form stored in the database: https://github.com/owner/repo */
export function normalizeGithubUrl(url: string) {
  const ref = parseGithubUrl(url);
  if (!ref) throw new Error("Invalid GitHub repository URL");
  return `https://github.com/${ref.owner}/${ref.repo}`;
}

export function getOctokit(token?: string) {
  return new Octokit({ auth: token ?? env.GITHUB_TOKEN });
}

export async function getRepoInfo(ref: RepoRef, token?: string) {
  const { data } = await getOctokit(token).rest.repos.get(ref);
  return { defaultBranch: data.default_branch, isPrivate: data.private };
}

async function getRecentCommits(ref: RepoRef, octokit: Octokit) {
  // GitHub returns commits newest first.
  const { data } = await octokit.rest.repos.listCommits({
    ...ref,
    per_page: COMMITS_TO_TRACK,
  });
  return data.map((commit) => ({
    commitHash: commit.sha,
    commitMessage: commit.commit.message,
    commitAuthorName: commit.commit.author?.name ?? commit.author?.login ?? "",
    commitAuthorAvatar: commit.author?.avatar_url ?? "",
    commitDate: new Date(
      commit.commit.author?.date ?? commit.commit.committer?.date ?? Date.now(),
    ),
  }));
}

async function getCommitDiff(ref: RepoRef, sha: string, octokit: Octokit) {
  const { data } = await octokit.rest.repos.getCommit({
    ...ref,
    ref: sha,
    mediaType: { format: "diff" },
  });
  // With the diff media type the API returns a string, not the JSON shape.
  return data as unknown as string;
}

/**
 * Fetches the latest commits for a project and stores AI summaries for any we
 * haven't seen yet. Safe to call concurrently: duplicates are skipped.
 */
export async function syncCommits(projectId: string, token?: string) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { githubUrl: true },
  });
  const ref = parseGithubUrl(project.githubUrl);
  if (!ref) throw new Error("Project has an invalid GitHub URL");

  const octokit = getOctokit(token);
  const recent = await getRecentCommits(ref, octokit);

  const known = await db.commit.findMany({
    where: { projectId, commitHash: { in: recent.map((c) => c.commitHash) } },
    select: { commitHash: true },
  });
  const knownHashes = new Set(known.map((c) => c.commitHash));
  const fresh = recent.filter((c) => !knownHashes.has(c.commitHash));

  const summaries = await mapWithConcurrency(fresh, 3, async (commit) => {
    try {
      const diff = await getCommitDiff(ref, commit.commitHash, octokit);
      return await summarizeCommitDiff(diff);
    } catch (error) {
      console.error(`Failed to summarize ${commit.commitHash}`, error);
      return "";
    }
  });

  const { count } = await db.commit.createMany({
    data: fresh.map((commit, i) => ({
      ...commit,
      projectId,
      summary: summaries[i] ?? "",
    })),
    skipDuplicates: true,
  });
  await db.project.update({
    where: { id: projectId },
    data: { commitsSyncedAt: new Date() },
  });
  return { added: count };
}
