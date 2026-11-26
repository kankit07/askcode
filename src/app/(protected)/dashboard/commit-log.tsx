"use client";

import { formatDistanceToNow } from "date-fns";
import { GitCommitHorizontal, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";

type Project = RouterOutputs["project"]["getProjects"][number];

export function CommitLog({ project }: { project: Project }) {
  const utils = api.useUtils();
  const isReady = project.status === "READY";
  const commits = api.project.getCommits.useQuery(
    { projectId: project.id },
    { enabled: isReady },
  );
  const sync = api.project.syncCommits.useMutation({
    onSuccess: async ({ added }) => {
      if (added > 0) {
        await utils.project.getCommits.invalidate({ projectId: project.id });
      }
    },
  });

  // Pick up new commits once when a ready project is opened. The server
  // rate-limits this, so switching back and forth is cheap.
  const { mutate } = sync;
  useEffect(() => {
    if (isReady) mutate({ projectId: project.id });
  }, [isReady, project.id, mutate]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Recent commits</h2>
          <p className="text-xs text-muted-foreground">
            Summarized by AI.
            {project.commitsSyncedAt &&
              ` Checked ${formatDistanceToNow(project.commitsSyncedAt, { addSuffix: true })}.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!isReady || sync.isPending}
          onClick={() =>
            sync.mutate(
              { projectId: project.id },
              {
                onSuccess: ({ added }) =>
                  toast.success(
                    added
                      ? `Found ${added} new commit${added === 1 ? "" : "s"}`
                      : "You're up to date",
                  ),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <RefreshCw className={sync.isPending ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      {!isReady || commits.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : commits.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <GitCommitHorizontal className="mx-auto mb-2 size-5" />
          {sync.isPending ? "Fetching commits…" : "No commits yet."}
        </div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border">
          {commits.data?.map((commit) => {
            const [title, ...body] = (commit.commitMessage ?? "").split("\n");
            return (
              <li key={commit.id} className="relative flex gap-4">
                <Avatar className="relative mt-3 size-8 ring-4 ring-background">
                  <AvatarImage
                    src={commit.commitAuthorAvatar ?? undefined}
                    alt=""
                  />
                  <AvatarFallback className="text-xs">
                    {initials(commit.commitAuthorName)}
                  </AvatarFallback>
                </Avatar>
                <article className="min-w-0 flex-1 rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">
                        {commit.commitAuthorName || "Unknown author"}
                      </span>{" "}
                      committed{" "}
                      {formatDistanceToNow(commit.commitDate, {
                        addSuffix: true,
                      })}
                    </span>
                    <a
                      href={`${project.githubUrl}/commit/${commit.commitHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono hover:text-foreground hover:underline"
                    >
                      {commit.commitHash.slice(0, 7)}
                    </a>
                  </div>
                  <h3 className="mt-1 break-words font-medium">{title}</h3>
                  {body.join("\n").trim() && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {body.join("\n").trim()}
                    </p>
                  )}
                  {commit.summary && (
                    <Markdown
                      source={commit.summary}
                      className="mt-3 border-t pt-3"
                    />
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
