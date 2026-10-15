import type { Extensions } from "../api/types";
import { FILTERS, type FilterDef, type Filters, type FilterValue } from "../config/topicFilters";
import { useResettableState } from "./useResettableState";

export type TopicFilters = ReturnType<typeof useTopicFilters>;

// Filters chosen for the current project; only value filters with values to pick from are offered.
// Labels come from the project extensions plus those seen on topics, as servers often leave topic_label empty.
export function useTopicFilters(projectId: string, extensions?: Extensions, seenLabels: string[] = []) {
  const [filters, setFilters] = useResettableState<Filters>(projectId, {});

  const options = (def: FilterDef) => {
    const defined = def.source ? (extensions?.[def.source] ?? []) : [];
    return def.source === "topic_label" ? [...defined, ...seenLabels.filter((l) => !defined.includes(l))] : defined;
  };
  const available = FILTERS.filter((def) => def.kind === "date" || options(def).length > 0);
  const addable = available.filter(({ key }) => !(key in filters));
  const active = available.filter(({ key }) => key in filters);
  const isSet = (key: string) => Object.values(filters[key] ?? {}).some(Boolean);

  const set = (key: string, change: FilterValue) => setFilters((f) => ({ ...f, [key]: { ...f[key], ...change } }));
  const add = (key: string) => set(key, {});
  const remove = (key: string) =>
    setFilters((f) => {
      const { [key]: _, ...rest } = f;
      return rest;
    });

  return { values: filters, options, addable, active, isSet, anySet: active.some(({ key }) => isSet(key)), set, add, remove };
}
