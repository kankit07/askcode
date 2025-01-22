import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { summarizeCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// const githubUrl = "https://github.com/docker/genai-stack";
type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitDate: string;
  commitAuthorAvatar: string;
};
export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  // https://github.com/docker/genai-stack
  try {
    const parts = githubUrl.split("/");
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];
    if (!owner || !repo) {
      throw new Error("Invalid github Url");
    }
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
    });
    const sortedCommits = data.sort(
      (a, b) =>
        new Date(b!.commit!.author!.date!).getTime() -
        new Date(a!.commit!.author!.date!).getTime(),
    );
    return sortedCommits.slice(0, 15).map((commit) => ({
      commitHash: commit.sha as string,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit.author?.avatar_url ?? "",
      commitDate: commit.commit.author?.date ?? "",
    }));
  } catch (error) {
    console.error("Error fetching commit hashes:", error);
    throw error;
  }
};
// console.log(await getCommitHashes(githubUrl));
export const pollCommits = async (projectId: string) => {
  const { githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );
  const summaryResponse = await Promise.allSettled(
    unprocessedCommits.map((commit) => {
      return summarizeCommits(githubUrl, commit.commitHash);
    }),
  );
  const summaries = summaryResponse.map((summary) => {
    if (summary.status === "fulfilled") {
      return summary.value as string;
    }
    return "No summary available";
  });

  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      // console.log(`processing commit ${index}`);
      return {
        projectId,
        commitHash: unprocessedCommits[index]?.commitHash ?? "",
        commitMessage: unprocessedCommits[index]?.commitMessage ?? "",
        commitAuthorName: unprocessedCommits[index]?.commitAuthorName ?? "",
        commitDate: unprocessedCommits[index]?.commitDate ?? "",
        commitAuthorAvatar: unprocessedCommits[index]?.commitAuthorAvatar ?? "",
        summary,
      };
    }),
  });
  return commits;
};

async function summarizeCommits(githubUrl: string, commitHash: string) {
  // get the diff then pass the diff to ai
  const { data } = (await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
    headers: {
      Accept: "application/vnd.gitub.v3.diff",
      // Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  })) as { data: string };
  return summarizeCommit(data) || "No summary available";
}
// async function summarizeCommits(githubUrl: string, commitHash: string) {
//   try {
//     const parts = githubUrl.split("/");
//     const owner = parts[parts.length - 2];
//     const repo = parts[parts.length - 1];

//     // Use octokit instead of direct axios call
//     const { data } = await octokit.rest.repos.getCommit({
//       owner,
//       repo,
//       ref: commitHash,
//       mediaType: {
//         format: "diff",
//       },
//     });

//     return (await summarizeCommit(data)) ?? "No summary available";
//   } catch (error) {
//     console.error("Error summarizing commit:", error);
//     return "Error generating summary";
//   }
// }
async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });
  if (!project?.githubUrl) {
    throw new Error("Project has no github url");
  }
  return { project, githubUrl: project?.githubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );
  return unprocessedCommits;
}
// pollCommits();
