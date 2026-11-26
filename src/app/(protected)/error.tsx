"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ProtectedError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        The page hit an unexpected error. Try again, and if it keeps happening
        reload the app.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
