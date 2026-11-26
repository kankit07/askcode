"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquareText, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AskQuestionCard } from "@/components/ask-question-card";
import { CodeReferences } from "@/components/code-references";
import { EmptyProjects } from "@/components/empty-projects";
import { Markdown } from "@/components/markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import useProject from "@/hooks/use-project";
import { parseFileReferences } from "@/lib/file-reference";
import { initials } from "@/lib/utils";
import { api } from "@/trpc/react";

/** Rough plain-text preview of a markdown answer. */
function preview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>[\]()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function QAPage() {
  const { project, projectId, isLoading } = useProject();
  const utils = api.useUtils();
  const questions = api.project.getQuestions.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const deleteQuestion = api.project.deleteQuestion.useMutation({
    onSuccess: async () => {
      toast.success("Answer deleted");
      setSelectedId(null);
      await utils.project.getQuestions.invalidate({ projectId });
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const all = questions.data ?? [];
    if (!needle) return all;
    return all.filter(
      (q) =>
        q.question.toLowerCase().includes(needle) ||
        q.answer.toLowerCase().includes(needle),
    );
  }, [questions.data, filter]);

  const selected = questions.data?.find((q) => q.id === selectedId);

  if (!isLoading && !project) return <EmptyProjects />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AskQuestionCard />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            Saved answers
            {questions.data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {questions.data.length}
              </span>
            )}
          </h2>
          {!!questions.data?.length && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search saved answers"
                className="pl-8"
              />
            </div>
          )}
        </div>

        {isLoading || questions.isLoading ? (
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : questions.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            <MessageSquareText className="mx-auto mb-2 size-5" />
            Answers you save show up here so your team can find them again.
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing matches “{filter}”.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(q.id)}
                  className="flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={q.user.image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {initials(q.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">{q.question}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(q.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {preview(q.answer)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-3xl">
          {selected && (
            <>
              <SheetHeader className="pr-6 text-left">
                <SheetTitle className="leading-snug">
                  {selected.question}
                </SheetTitle>
                <SheetDescription>
                  Saved by {selected.user.name ?? "someone"}{" "}
                  {formatDistanceToNow(selected.createdAt, { addSuffix: true })}
                </SheetDescription>
              </SheetHeader>
              <Markdown source={selected.answer} />
              <CodeReferences
                fileReferences={parseFileReferences(selected.fileReferences)}
              />
              <div className="mt-auto flex justify-end border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this answer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        It will be removed for everyone on this project. This
                        can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() =>
                          deleteQuestion.mutate({ questionId: selected.id })
                        }
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
