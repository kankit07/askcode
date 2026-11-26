"use client";

import {
  Archive,
  ExternalLink,
  Github,
  MoreHorizontal,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";

export function ProjectHeader() {
  const { project, isLoading } = useProject();
  const utils = api.useUtils();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const archive = api.project.archiveProject.useMutation({
    onSuccess: async () => {
      toast.success(`Archived ${project?.name}`);
      setConfirmArchive(false);
      await utils.project.getProjects.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const retry = api.project.retryIndexing.useMutation({
    onSuccess: async () => {
      toast.success("Re-indexing started");
      await utils.project.getProjects.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const repoPath = project?.githubUrl.replace("https://github.com/", "");

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      {isLoading ? (
        <Skeleton className="h-5 w-40" />
      ) : project ? (
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-semibold">{project.name}</h1>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 truncate text-sm text-muted-foreground hover:text-foreground hover:underline sm:inline-flex"
          >
            <Github className="size-3.5" />
            {repoPath}
          </a>
          <ProjectStatusBadge project={project} />
        </div>
      ) : (
        <h1 className="font-semibold">AskCode</h1>
      )}

      {project && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Project actions"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={project.githubUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open on GitHub
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={project.status === "INDEXING" || retry.isPending}
              onSelect={() => retry.mutate({ projectId: project.id })}
            >
              <RotateCw />
              Re-index repository
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmArchive(true)}
            >
              <Archive />
              Archive project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {project?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The project will disappear from your sidebar. Its saved answers
              are kept in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archive.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (project) archive.mutate({ projectId: project.id });
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
