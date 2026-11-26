"use client";

import { FileCode2 } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type FileReference } from "@/lib/file-reference";

const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-md bg-muted" />,
  },
);

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  php: "php",
  cs: "csharp",
  c: "c",
  h: "c",
  cpp: "cpp",
  css: "css",
  scss: "scss",
  html: "markup",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sql: "sql",
  sh: "bash",
  prisma: "graphql",
};

function languageFor(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGES[ext] ?? "text";
}

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export function CodeReferences({
  fileReferences,
}: {
  fileReferences: FileReference[];
}) {
  const [selected, setSelected] = useState<string>();
  if (fileReferences.length === 0) return null;

  // Derive the active tab so it stays valid when the references change.
  const active =
    fileReferences.find((f) => f.fileName === selected)?.fileName ??
    fileReferences[0]!.fileName;

  return (
    <section className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <FileCode2 className="size-4 text-muted-foreground" />
        Sources ({fileReferences.length})
      </h3>
      <Tabs value={active} onValueChange={setSelected} className="min-w-0">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          {fileReferences.map((file) => (
            <TabsTrigger
              key={file.fileName}
              value={file.fileName}
              title={file.fileName}
            >
              {baseName(file.fileName)}
              {file.similarity !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {Math.round(file.similarity * 100)}%
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {fileReferences.map((file) => (
          <TabsContent
            key={file.fileName}
            value={file.fileName}
            className="space-y-2"
          >
            <div className="rounded-md bg-muted/60 p-3 text-sm">
              <code className="text-xs text-muted-foreground">
                {file.fileName}
              </code>
              <p className="mt-1">{file.summary}</p>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-md">
              <SyntaxHighlighter
                language={languageFor(file.fileName)}
                style={oneDark}
                showLineNumbers
                customStyle={{ margin: 0, fontSize: "0.8rem" }}
              >
                {file.sourceCode}
              </SyntaxHighlighter>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
