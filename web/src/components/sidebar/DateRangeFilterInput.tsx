import { STRINGS } from "../../config/strings";
import { DATE_RANGE_ENDS } from "../../config/topicFilters";
import { inputValue } from "../../lib/dom";
import { cx } from "../../lib/format";
import controls from "../common/controls.module.css";
import styles from "./DateRangeFilterInput.module.css";
import type { FilterInputProps } from "./filterInputs";

export function DateRangeFilterInput({ def, value, onChange }: FilterInputProps) {
  return (
    <span class={styles.range}>
      {DATE_RANGE_ENDS.map((end) => (
        <input
          type="date"
          value={value[end] ?? ""}
          onChange={(e) => onChange({ [end]: inputValue(e) })}
          aria-label={STRINGS.sidebar.dateRangeLabel(def.label, end)}
          title={STRINGS.sidebar.dateRangeEnd[end]}
          class={cx(styles.date, value[end] && controls.highlighted)}
        />
      ))}
    </span>
  );
}
