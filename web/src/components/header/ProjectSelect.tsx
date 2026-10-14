import type { Project } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { OptionSelect } from "../common/OptionSelect";
import styles from "./ProjectSelect.module.css";

type Props = { projects: Project[]; value: string; onChange: (projectId: string) => void };

export function ProjectSelect({ projects, value, onChange }: Props) {
  const options = projects.map((p) => ({ value: p.project_id, label: p.name }));
  return <OptionSelect value={value} options={options} onChange={onChange} label={STRINGS.header.project} class={styles.select} />;
}
