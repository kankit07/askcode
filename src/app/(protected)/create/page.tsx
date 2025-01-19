"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};
const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();
  function onSubmit(data: FormInput) {
    // console.log(data)
    window.alert(JSON.stringify(data));
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully");
          refetch();
          reset();
        },
        onError: () => {
          toast.error("Failed to create project");
        },
      },
    );
  }
  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img alt="undrrea" src="/undraej/" className="h-56 w-auto" />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            {" "}
            Link your Github Repository{" "}
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the URL of your Github repository to get started with Askcode
          </p>
        </div>
        <div className="h-4" />
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Projectname"
              required
            />
            <div className="h-2" />
            <Input
              {...register("repoUrl", { required: true })}
              placeholder="Github URL"
              required
            />
            <div className="h-2" />
            <Input
              {...register("githubToken")}
              placeholder="Github Token (Optional)"
            />
            <div className="h-4" />
            <Button type="submit" disabled={createProject.isPending}>
              Create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default CreatePage;
