"use client";

import { readStreamableValue } from "ai/rsc";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AnswerDialog, type AnswerState } from "@/components/answer-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import { askQuestion } from "@/server/actions/ask-question";
import { api } from "@/trpc/react";

const EXAMPLES = [
  "How is authentication handled?",
  "Which file should I edit to change the home page?",
  "Give me a tour of the project structure.",
];

export function AskQuestionCard() {
  const { project } = useProject();
  const utils = api.useUtils();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AnswerState | null>(null);
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  // Ignores updates from an earlier question if a new one is asked mid-stream.
  const requestId = useRef(0);

  const saveAnswer = api.project.saveAnswer.useMutation();

  const isReady = project?.status === "READY";
  const busy = state?.status === "searching" || state?.status === "streaming";

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!project || !trimmed || busy) return;

    const id = ++requestId.current;
    const update = (patch: Partial<AnswerState>) => {
      if (id === requestId.current)
        setState((s) => (s ? { ...s, ...patch } : s));
    };

    setSaveState("idle");
    setState({
      question: trimmed,
      answer: "",
      fileReferences: [],
      status: "searching",
    });
    setOpen(true);

    try {
      const result = await askQuestion(trimmed, project.id);
      if (!result.ok) {
        update({ status: "error", error: result.error });
        return;
      }
      update({ fileReferences: result.fileReferences, status: "streaming" });
      for await (const answer of readStreamableValue(result.answer)) {
        if (answer !== undefined) update({ answer });
      }
      let failure: string | undefined;
      for await (const value of readStreamableValue(result.error)) {
        failure = value;
      }
      update(
        failure ? { status: "error", error: failure } : { status: "done" },
      );
    } catch (error) {
      console.error(error);
      update({
        status: "error",
        error: "Something went wrong. Please try again.",
      });
    }
  }

  function save() {
    if (!project || !state) return;
    setSaveState("saving");
    saveAnswer.mutate(
      {
        projectId: project.id,
        question: state.question,
        answer: state.answer,
        fileReferences: state.fileReferences,
      },
      {
        onSuccess: () => {
          setSaveState("saved");
          toast.success("Answer saved to Q&A");
          void utils.project.getQuestions.invalidate({ projectId: project.id });
        },
        onError: (error) => {
          setSaveState("idle");
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <>
      <AnswerDialog
        state={state}
        open={open}
        onOpenChange={setOpen}
        onSave={save}
        onRetry={() => state && void ask(state.question)}
        saveState={saveState}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Ask about {project?.name ?? "your code"}
          </CardTitle>
          <CardDescription>
            {isReady
              ? "Answers are based on the files in this repository."
              : "You can ask questions once indexing finishes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
            className="space-y-3"
          >
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void ask(question);
                }
              }}
              placeholder="e.g. Where are API routes defined?"
              rows={3}
              maxLength={2000}
              disabled={!isReady}
              className="resize-none"
              aria-label="Your question"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={!isReady || busy}
                    onClick={() => {
                      setQuestion(example);
                      void ask(example);
                    }}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={!isReady || busy || !question.trim()}
              >
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CornerDownLeft />
                )}
                Ask
                <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 text-[10px] font-medium sm:inline">
                  ⌘↵
                </kbd>
              </Button>
            </div>
          </form>
          {state && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 truncate text-left text-sm text-primary hover:underline"
            >
              {busy ? "Answer in progress" : "Show last answer"}:{" "}
              {state.question}
            </button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
