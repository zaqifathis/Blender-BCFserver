import { STRINGS } from "../../config/strings";
import type { TopicFilters } from "../../hooks/useTopicFilters";
import { inputValue } from "../../lib/dom";
import { FilterMenuButton } from "./FilterMenuButton";
import styles from "./TopicSearchBar.module.css";

type Props = { search: string; onSearch: (search: string) => void; filters: TopicFilters; resetKey: string };

export function TopicSearchBar({ search, onSearch, filters, resetKey }: Props) {
  return (
    <div class={styles.bar}>
      <input type="search" placeholder={STRINGS.sidebar.search} value={search} onInput={(e) => onSearch(inputValue(e))} />
      <FilterMenuButton filters={filters} resetKey={resetKey} />
    </div>
  );
}
