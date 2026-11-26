"use client";

import { Check, Copy, Loader2, RotateCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CodeReferences } from "@/components/code-references";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type FileReference } from "@/lib/file-reference";

export type AnswerState = {
  question: string;
  answer: string;
  fileReferences: FileReference[];
  status: "searching" | "streaming" | "done" | "error";
  error?: string;
};

type Props = {
  state: AnswerState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onRetry: () => void;
  saveState: "idle" | "saving" | "saved";
};

export function AnswerDialog({
  state,
  open,
  onOpenChange,
  onSave,
  onRetry,
  saveState,
}: Props) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  const finished = state.status === "done";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-lg leading-snug">
            {state.question}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {state.status === "searching" && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Searching the
                codebase…
              </>
            )}
            {state.status === "streaming" && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Writing answer…
              </>
            )}
            {state.status === "done" &&
              `Answered using ${state.fileReferences.length} file${state.fileReferences.length === 1 ? "" : "s"}`}
            {state.status === "error" && (
              <span className="text-destructive">{state.error}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 min-h-0 flex-1 space-y-6 overflow-y-auto px-6">
          {state.answer ? (
            <Markdown source={state.answer} />
          ) : state.status !== "error" ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : null}
          <CodeReferences fileReferences={state.fileReferences} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            disabled={!finished}
            onClick={() => {
              void navigator.clipboard.writeText(state.answer).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy answer"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {state.status === "error" && (
              <Button onClick={onRetry}>
                <RotateCw />
                Try again
              </Button>
            )}
            {state.status !== "error" && (
              <Button
                disabled={!finished || saveState !== "idle"}
                onClick={() => {
                  if (!state.answer.trim()) {
                    toast.error("There's no answer to save.");
                    return;
                  }
                  onSave();
                }}
              >
                {saveState === "saving" ? (
                  <Loader2 className="animate-spin" />
                ) : saveState === "saved" ? (
                  <Check />
                ) : (
                  <Save />
                )}
                {saveState === "saved" ? "Saved" : "Save answer"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
