"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Github, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";

const GITHUB_REPO = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i;

const formSchema = z.object({
  githubUrl: z
    .string()
    .trim()
    .regex(GITHUB_REPO, "Enter a URL like https://github.com/owner/repo"),
  name: z.string().trim().min(1, "Give your project a name").max(80),
  githubToken: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

/** "https://github.com/vercel/next.js" -> "next.js" */
function repoName(url: string) {
  return GITHUB_REPO.test(url)
    ? url
        .replace(/\/+$/, "")
        .split("/")[4]
        ?.replace(/\.git$/, "")
    : undefined;
}

export default function CreatePage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { setProjectId } = useProject();
  const [showToken, setShowToken] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { githubUrl: "", name: "", githubToken: "" },
  });
  const { errors } = form.formState;

  const createProject = api.project.createProject.useMutation({
    onSuccess: async (project) => {
      setProjectId(project.id);
      await utils.project.getProjects.invalidate();
      toast.success(`Indexing ${project.name}…`, {
        description: "You can start asking questions when it finishes.",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      const fieldErrors = error.data?.zodError?.fieldErrors;
      if (fieldErrors?.githubUrl?.[0]) {
        form.setError("githubUrl", { message: fieldErrors.githubUrl[0] });
      } else {
        toast.error(error.message);
      }
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 py-6 md:flex-row md:py-12">
      <Image
        src="/illustration.png"
        alt=""
        width={220}
        height={220}
        className="hidden md:block"
      />
      <Card className="w-full max-w-md">
        <form
          onSubmit={form.handleSubmit((values) => createProject.mutate(values))}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="size-5" />
              Connect a repository
            </CardTitle>
            <CardDescription>
              AskCode reads the files on the default branch and summarizes
              recent commits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="githubUrl">Repository URL</Label>
              <Input
                id="githubUrl"
                placeholder="https://github.com/owner/repo"
                autoFocus
                autoComplete="off"
                aria-invalid={!!errors.githubUrl}
                {...form.register("githubUrl", {
                  onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
                    // Suggest a project name from the repo if none was typed.
                    const suggestion = repoName(event.target.value);
                    if (suggestion && !form.getValues("name")) {
                      form.setValue("name", suggestion, {
                        shouldValidate: true,
                      });
                    }
                  },
                })}
              />
              {errors.githubUrl && (
                <p className="text-sm text-destructive">
                  {errors.githubUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="My app"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={showToken}
              >
                <ChevronDown
                  className={`size-4 transition-transform ${showToken ? "" : "-rotate-90"}`}
                />
                Private repository?
              </button>
              {showToken && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="githubToken">GitHub access token</Label>
                  <Input
                    id="githubToken"
                    type="password"
                    placeholder="github_pat_…"
                    autoComplete="off"
                    {...form.register("githubToken")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Needs read access to the repository&apos;s contents.
                    It&apos;s used once for indexing and isn&apos;t stored.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={createProject.isPending}
            >
              {createProject.isPending && <Loader2 className="animate-spin" />}
              {createProject.isPending
                ? "Checking repository…"
                : "Create project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
