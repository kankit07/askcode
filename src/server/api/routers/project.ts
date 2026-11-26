import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import { z } from "zod";

import { fileReferenceSchema } from "@/lib/file-reference";
import {
  getRepoInfo,
  normalizeGithubUrl,
  parseGithubUrl,
  syncCommits,
} from "@/lib/github";
import { indexProject } from "@/lib/indexer";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findProjectForUser } from "@/server/project-access";

const projectIdInput = z.object({ projectId: z.string().min(1) });

/** Don't hit GitHub + Gemini again if commits were synced this recently. */
const COMMIT_SYNC_COOLDOWN_MS = 60_000;

async function requireProject(projectId: string, userId: string) {
  const project = await findProjectForUser(projectId, userId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return project;
}

export const projectRouter = createTRPCRouter({
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Give your project a name").max(80),
        githubUrl: z
          .string()
          .trim()
          .refine((url) => parseGithubUrl(url) !== null, {
            message:
              "Enter a GitHub repository URL like https://github.com/owner/repo",
          }),
        githubToken: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const githubToken = input.githubToken || undefined;
      const ref = parseGithubUrl(input.githubUrl)!;

      // Fail fast on typos and private repos before creating anything.
      try {
        await getRepoInfo(ref, githubToken);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: githubToken
            ? "Couldn't access that repository with the token you provided."
            : "Couldn't find that repository. If it's private, add a GitHub token.",
        });
      }

      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          githubUrl: normalizeGithubUrl(input.githubUrl),
          status: "INDEXING",
          UserToProject: { create: { userId: ctx.session.user.id } },
        },
      });

      // Indexing takes minutes; respond now and keep working after the response.
      after(() => indexProject(project.id, githubToken));

      return project;
    }),

  retryIndexing: protectedProcedure
    .input(projectIdInput)
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(
        input.projectId,
        ctx.session.user.id,
      );
      if (project.status === "INDEXING") return project;
      await ctx.db.sourceCodeEmbedding.deleteMany({
        where: { projectId: project.id },
      });
      const updated = await ctx.db.project.update({
        where: { id: project.id },
        data: {
          status: "INDEXING",
          indexedFiles: 0,
          totalFiles: 0,
          indexError: null,
        },
      });
      after(() => indexProject(project.id));
      return updated;
    }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: {
        UserToProject: { some: { userId: ctx.session.user.id } },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  archiveProject: protectedProcedure
    .input(projectIdInput)
    .mutation(async ({ ctx, input }) => {
      await requireProject(input.projectId, ctx.session.user.id);
      await ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
      });
    }),

  getCommits: protectedProcedure
    .input(projectIdInput)
    .query(async ({ ctx, input }) => {
      await requireProject(input.projectId, ctx.session.user.id);
      return ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { commitDate: "desc" },
      });
    }),

  syncCommits: protectedProcedure
    .input(projectIdInput)
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(
        input.projectId,
        ctx.session.user.id,
      );
      const syncedAt = project.commitsSyncedAt?.getTime() ?? 0;
      if (Date.now() - syncedAt < COMMIT_SYNC_COOLDOWN_MS) {
        return { added: 0 };
      }
      try {
        return await syncCommits(project.id);
      } catch (error) {
        console.error("Commit sync failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't fetch commits from GitHub.",
        });
      }
    }),

  saveAnswer: protectedProcedure
    .input(
      projectIdInput.extend({
        question: z.string().min(1),
        answer: z.string().min(1),
        fileReferences: z.array(fileReferenceSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProject(input.projectId, ctx.session.user.id);
      return ctx.db.question.create({
        data: {
          answer: input.answer,
          fileReferences: input.fileReferences,
          projectId: input.projectId,
          question: input.question,
          userId: ctx.session.user.id,
        },
      });
    }),

  getQuestions: protectedProcedure
    .input(projectIdInput)
    .query(async ({ ctx, input }) => {
      await requireProject(input.projectId, ctx.session.user.id);
      return ctx.db.question.findMany({
        where: { projectId: input.projectId },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  deleteQuestion: protectedProcedure
    .input(z.object({ questionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.question.deleteMany({
        where: {
          id: input.questionId,
          project: { UserToProject: { some: { userId: ctx.session.user.id } } },
        },
      });
      if (count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }
    }),
});
