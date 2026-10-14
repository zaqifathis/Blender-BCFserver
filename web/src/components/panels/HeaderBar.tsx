import type { Project } from "../../api/types";
import { AppTitle } from "../header/AppTitle";
import { ConnectionIndicator } from "../header/ConnectionIndicator";
import { ProjectSelect } from "../header/ProjectSelect";

type Props = { connected: boolean; projects: Project[]; projectId: string; onProjectChange: (projectId: string) => void };

export function HeaderBar({ connected, projects, projectId, onProjectChange }: Props) {
  return (
    <>
      <AppTitle />
      <ProjectSelect projects={projects} value={projectId} onChange={onProjectChange} />
      <ConnectionIndicator connected={connected} />
    </>
  );
}
