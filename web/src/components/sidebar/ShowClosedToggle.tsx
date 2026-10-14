import { STRINGS } from "../../config/strings";
import { inputChecked } from "../../lib/dom";
import styles from "./ShowClosedToggle.module.css";

export function ShowClosedToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label class={styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(inputChecked(e))} /> {STRINGS.sidebar.showClosed}
    </label>
  );
}
