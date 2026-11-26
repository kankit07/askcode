import { useLocalStorage } from "usehooks-ts";

import { api } from "@/trpc/react";

const INDEXING_POLL_MS = 3000;

/**
 * The project the user is working in. The selection is remembered in
 * localStorage; if it's missing or archived we fall back to the newest project.
 */
const useProject = () => {
  const projectsQuery = api.project.getProjects.useQuery(undefined, {
    // Keep progress fresh while any project is still indexing.
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === "INDEXING")
        ? INDEXING_POLL_MS
        : false,
  });
  const [selectedId, setProjectId] = useLocalStorage("askcode:projectId", "", {
    initializeWithValue: false,
  });

  const projects = projectsQuery.data;
  const project = projects?.find((p) => p.id === selectedId) ?? projects?.[0];

  return {
    projects,
    project,
    projectId: project?.id ?? "",
    setProjectId,
    isLoading: projectsQuery.isLoading,
  };
};

export default useProject;
