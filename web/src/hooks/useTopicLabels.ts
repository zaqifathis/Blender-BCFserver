import type { Topic } from "../api/types";
import { useResettableState } from "./useResettableState";

// Labels seen on loaded topics, kept for the project so the options do not shrink while a filter narrows the list
export function useTopicLabels(projectId: string) {
  const [labels, setLabels] = useResettableState<string[]>(projectId, []);
  const track = (topics?: Topic[]) => {
    const found = (topics ?? []).flatMap((t) => t.labels ?? []);
    setLabels((known) => {
      const added = [...new Set(found)].filter((l) => !known.includes(l));
      return added.length ? [...known, ...added].sort((a, b) => a.localeCompare(b)) : known;
    });
  };
  return [labels, track] as const;
}
