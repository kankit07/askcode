"use client";

import { AskQuestionCard } from "@/components/ask-question-card";
import { EmptyProjects } from "@/components/empty-projects";
import { IndexingStatus } from "@/components/indexing-status";
import { Skeleton } from "@/components/ui/skeleton";
import useProject from "@/hooks/use-project";
import { CommitLog } from "./commit-log";

export default function DashboardPage() {
  const { project, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!project) return <EmptyProjects />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {project.status !== "READY" && <IndexingStatus project={project} />}
      <AskQuestionCard />
      <CommitLog project={project} />
    </div>
  );
}
