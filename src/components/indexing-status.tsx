"use client";

import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, type RouterOutputs } from "@/trpc/react";

type Project = RouterOutputs["project"]["getProjects"][number];

export function IndexingStatus({ project }: { project: Project }) {
  const utils = api.useUtils();
  const retry = api.project.retryIndexing.useMutation({
    onSuccess: () => utils.project.getProjects.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  if (project.status === "FAILED") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>We couldn&apos;t index this repository</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            {project.indexError ??
              "Something went wrong while reading the files."}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={retry.isPending}
            onClick={() => retry.mutate({ projectId: project.id })}
          >
            <RotateCw
              className={retry.isPending ? "animate-spin" : undefined}
            />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { indexedFiles, totalFiles } = project;
  const percent = totalFiles
    ? Math.round((indexedFiles / totalFiles) * 100)
    : 0;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="size-4 animate-spin text-primary" />
        {totalFiles
          ? `Reading files… ${indexedFiles} of ${totalFiles}`
          : "Fetching repository…"}
      </div>
      <Progress value={percent} />
      <p className="text-xs text-muted-foreground">
        This usually takes a few minutes for a medium-sized repo. You can leave
        this page; indexing keeps going.
      </p>
    </div>
  );
}
