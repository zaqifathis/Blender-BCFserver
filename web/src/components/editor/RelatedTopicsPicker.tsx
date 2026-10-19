import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { cx } from "../../lib/format";
import { topicLabel } from "../../lib/topic";
import controls from "../common/controls.module.css";
import { OptionSelect } from "../common/OptionSelect";
import styles from "./RelatedTopicsPicker.module.css";

type Props = {
  // Every topic of the project except the edited one
  topics: Topic[];
  value: string[];
  onChange: (topicIds: string[]) => void;
  disabled?: boolean;
};

// Chips for the chosen topics, plus a dropdown adding one more. A related topic no longer in the project
// keeps its guid as chip text, so it can still be removed
export function RelatedTopicsPicker({ topics, value, onChange, disabled }: Props) {
  const { editor } = STRINGS;
  const byGuid = new Map(topics.map((t) => [t.guid, t]));
  const options = topics
    .filter((t) => !value.includes(t.guid))
    .map((t) => ({ value: t.guid, label: topicLabel(t) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div class={styles.picker}>
      {value.length > 0 && (
        <ul class={styles.chips} aria-label={editor.relatedTopics}>
          {value.map((guid) => {
            const label = byGuid.has(guid) ? topicLabel(byGuid.get(guid)!) : guid;
            return (
              <li class={cx(styles.chip, controls.highlighted)}>
                <span class={styles.chipLabel}>{label}</span>
                <button
                  type="button"
                  class={styles.remove}
                  aria-label={editor.removeRelated(label)}
                  title={editor.removeRelated(label)}
                  disabled={disabled}
                  onClick={() => onChange(value.filter((g) => g !== guid))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* Remounted after each pick so it shows the prompt again */}
      <OptionSelect
        key={value.length}
        value=""
        options={options}
        onChange={(guid) => guid && onChange([...value, guid])}
        label={editor.addRelated}
        emptyLabel={editor.addRelated}
        disabled={disabled || !options.length}
      />
      {!topics.length && <span class={styles.empty}>{editor.noOtherTopics}</span>}
    </div>
  );
}
