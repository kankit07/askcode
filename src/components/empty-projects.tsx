import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EmptyProjects() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Image src="/illustration.png" alt="" width={140} height={140} />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Connect your first repository</h2>
        <p className="text-sm text-muted-foreground">
          AskCode reads your GitHub repository so you can ask questions about it
          and catch up on recent commits.
        </p>
      </div>
      <Button asChild>
        <Link href="/create">
          <Plus />
          New project
        </Link>
      </Button>
    </div>
  );
}
