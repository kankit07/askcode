import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type RouterOutputs } from "@/trpc/react";

type Project = RouterOutputs["project"]["getProjects"][number];

export function ProjectStatusBadge({ project }: { project: Project }) {
  if (project.status === "INDEXING") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
        <Loader2 className="size-3 animate-spin" />
        Indexing
      </Badge>
    );
  }
  if (project.status === "FAILED") {
    return (
      <Badge variant="destructive" className="shrink-0 font-normal">
        Indexing failed
      </Badge>
    );
  }
  return null;
}
