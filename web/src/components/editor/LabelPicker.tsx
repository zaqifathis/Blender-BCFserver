import { STRINGS } from "../../config/strings";
import { cx } from "../../lib/format";
import controls from "../common/controls.module.css";
import styles from "./LabelPicker.module.css";

type Props = { options: string[]; value: string[]; onChange: (labels: string[]) => void };

// Toggle chips; labels already on the topic stay pickable even when the project no longer lists them
export function LabelPicker({ options, value, onChange }: Props) {
  const all = [...options, ...value.filter((l) => !options.includes(l))];
  if (!all.length) return <span class={styles.empty}>{STRINGS.editor.noLabels}</span>;
  const toggle = (label: string) => onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label]);
  return (
    <div class={styles.labels} role="group" aria-label={STRINGS.editor.labels}>
      {all.map((label) => {
        const on = value.includes(label);
        return (
          <button type="button" class={cx(styles.chip, on && controls.highlighted)} aria-pressed={on} onClick={() => toggle(label)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
