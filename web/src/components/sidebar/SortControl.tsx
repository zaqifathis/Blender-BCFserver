import { STRINGS } from "../../config/strings";
import { TOPIC_SORTS, type Sort } from "../../config/topicSorts";
import { fieldActionClass, FieldRow } from "../common/FieldRow";
import { IconButton } from "../common/IconButton";
import { OptionSelect } from "../common/OptionSelect";
import styles from "./SortControl.module.css";

const SORT_OPTIONS = TOPIC_SORTS.map(({ key, label }) => ({ value: key, label }));

export function SortControl({ sort, onChange }: { sort: Sort; onChange: (sort: Sort) => void }) {
  const { sortDescending, sortAscending, descending, ascending } = STRINGS.sidebar;
  return (
    <div class={styles.sort}>
      <FieldRow
        label={STRINGS.sidebar.sort}
        action={
          <IconButton
            label={sort.desc ? sortDescending : sortAscending}
            title={sort.desc ? descending : ascending}
            onClick={() => onChange({ ...sort, desc: !sort.desc })}
            class={fieldActionClass}
          >
            {sort.desc ? "↓" : "↑"}
          </IconButton>
        }
      >
        <OptionSelect
          value={sort.field}
          options={SORT_OPTIONS}
          onChange={(field) => onChange({ ...sort, field })}
          label={STRINGS.sidebar.sortBy}
        />
      </FieldRow>
    </div>
  );
}
