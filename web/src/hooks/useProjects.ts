import { useEffect, useState } from "preact/hooks";
import { listProjects } from "../api/bcf";
import { useAsync } from "./useAsync";

// Project list, selecting the first project once loaded
export function useProjects(connected: boolean) {
  const projects = useAsync(connected ? listProjects : null, [connected]);
  const [projectId, setProjectId] = useState("");
  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].project_id);
  }, [projects.data]);
  return { projects: projects.data ?? [], projectId, setProjectId };
}
