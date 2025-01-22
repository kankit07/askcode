"use client";

import useProject from "@/hooks/use-project";
import Image from "next/image";

type ProjectHeaderProps = {
  userImage?: string | null;
};

export const ProjectHeader = ({ userImage }: ProjectHeaderProps) => {
  const { project } = useProject();

  return (
    <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar p-2 px-4">
      {/* Display project name */}
      <div className="text-md font-semibold">
        {project?.name ?? "Select a project"}
      </div>

      <div className="ml-auto" />

      {userImage && (
        <Image
          src={userImage}
          alt="Profile"
          className="relative h-8 w-8 rounded-full border border-border"
          width={32}
          height={32}
        />
      )}
    </div>
  );
};
