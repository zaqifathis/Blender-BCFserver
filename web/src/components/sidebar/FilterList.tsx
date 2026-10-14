import type { TopicFilters } from "../../hooks/useTopicFilters";
import styles from "./FilterList.module.css";
import { FilterRow } from "./FilterRow";

export function FilterList({ filters }: { filters: TopicFilters }) {
  if (filters.active.length === 0) return null;
  return (
    <div class={styles.list}>
      {filters.active.map((def) => (
        <FilterRow
          def={def}
          value={filters.values[def.key]}
          options={filters.options(def)}
          onChange={(change) => filters.set(def.key, change)}
          onRemove={() => filters.remove(def.key)}
        />
      ))}
    </div>
  );
}
