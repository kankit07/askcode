"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};
const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">Creating Project...</h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we set up your project
        </p>
      </div>
    </div>
  );
};
const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();
  function onSubmit(data: FormInput) {
    // console.log(data)
    // window.alert(JSON.stringify(data));
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: async () => {
          toast.success("Project created successfully");
          await refetch();
          reset();
        },
        onError: () => {
          toast.error("Failed to create project");
        },
      },
    );
  }

  return (
    <>
      {createProject.isPending && <LoadingOverlay />}
      <div className="flex h-full items-center justify-center gap-12">
        <Image
          alt="undrrea"
          src="/AI Friends Icon (1).png"
          width={240}
          height={240}
        />
        <div>
          <div>
            <h1 className="text-2xl font-semibold">
              {" "}
              Link your Github Repository{" "}
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the URL of your Github repository to get started with
              Askcode
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
    </>
  );
};
export default CreatePage;
