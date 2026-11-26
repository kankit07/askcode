"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

// The renderer is large; load it only when markdown is actually shown.
const MarkdownPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  {
    ssr: false,
    loading: () => <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />,
  },
);

export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div data-color-mode="light" className={cn("min-w-0", className)}>
      <MarkdownPreview
        source={source}
        className="!bg-transparent !text-sm !leading-relaxed"
      />
    </div>
  );
}
