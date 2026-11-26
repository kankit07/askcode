import "server-only";

import { db } from "@/server/db";

/**
 * Returns the project if `userId` is a member and it hasn't been archived,
 * otherwise null. Every read or write scoped to a project goes through this.
 */
export async function findProjectForUser(projectId: string, userId: string) {
  return db.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      UserToProject: { some: { userId } },
    },
  });
}
