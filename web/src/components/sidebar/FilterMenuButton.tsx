import { useRef } from "preact/hooks";
import { STRINGS } from "../../config/strings";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useResettableState } from "../../hooks/useResettableState";
import type { TopicFilters } from "../../hooks/useTopicFilters";
import { FilterIcon } from "../common/icons/FilterIcon";
import { IconButton } from "../common/IconButton";
import { FilterMenu } from "./FilterMenu";
import styles from "./FilterMenuButton.module.css";

// Opens a menu of filters not yet added; closes on pick, outside click or project change
export function FilterMenuButton({ filters, resetKey }: { filters: TopicFilters; resetKey: string }) {
  const [open, setOpen] = useResettableState(resetKey, false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  const canAdd = filters.addable.length > 0;
  const pick = (key: string) => {
    filters.add(key);
    setOpen(false);
  };

  return (
    <div class={styles.anchor} ref={ref}>
      <IconButton
        label={STRINGS.sidebar.addFilter}
        title={canAdd ? STRINGS.sidebar.addFilter : STRINGS.sidebar.noMoreFilters}
        onClick={() => setOpen((o) => !o)}
        highlighted={filters.anySet}
        disabled={!canAdd}
        expanded={open}
      >
        <FilterIcon />
      </IconButton>
      {open && canAdd && <FilterMenu defs={filters.addable} onPick={pick} />}
    </div>
  );
}
