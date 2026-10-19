import type { Extensions } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { TopicFields } from "../../hooks/useTopicDraft";
import { inputValue } from "../../lib/dom";
import { OptionSelect, toOptions } from "../common/OptionSelect";
import { Field } from "./Field";
import { LabelPicker } from "./LabelPicker";
import styles from "./TopicFieldsForm.module.css";

type SelectKey = "topic_type" | "priority" | "topic_status" | "assigned_to" | "stage";
type Props = {
  fields: TopicFields;
  onChange: <K extends keyof TopicFields>(key: K, value: TopicFields[K]) => void;
  extensions?: Extensions;
  labelOptions: string[];
};

const { editor } = STRINGS;

// Pick lists from the project extensions, in form order; "due_date" marks where the date input goes
const SELECTS: ({ key: SelectKey; label: string; source: keyof Extensions } | { key: "due_date"; label: string })[] = [
  { key: "topic_type", label: editor.type, source: "topic_type" },
  { key: "priority", label: editor.priority, source: "priority" },
  { key: "topic_status", label: editor.status, source: "topic_status" },
  { key: "due_date", label: editor.deadline },
  { key: "assigned_to", label: editor.assignedTo, source: "users" },
  { key: "stage", label: editor.stage, source: "stage" },
];

export function TopicFieldsForm({ fields, onChange, extensions, labelOptions }: Props) {
  return (
    <div class={styles.grid}>
      <Field label={editor.title} required wide>
        <input type="text" value={fields.title} required onInput={(e) => onChange("title", inputValue(e))} />
      </Field>
      <Field label={editor.description} wide>
        <textarea rows={4} value={fields.description} onInput={(e) => onChange("description", inputValue(e))} />
      </Field>
      <Field label={editor.labels} wide group>
        <LabelPicker options={labelOptions} value={fields.labels} onChange={(labels) => onChange("labels", labels)} />
      </Field>
      {SELECTS.map((def) => {
        if (!("source" in def)) {
          return (
            <Field label={def.label}>
              <input type="datetime-local" value={fields.due_date} onInput={(e) => onChange("due_date", inputValue(e))} />
            </Field>
          );
        }
        const value = fields[def.key];
        const defined = extensions?.[def.source] ?? [];
        // Keep a value the project no longer lists, so saving does not silently drop it
        const options = toOptions(value && !defined.includes(value) ? [...defined, value] : defined);
        return (
          <Field label={def.label}>
            <OptionSelect value={value} options={options} onChange={(v) => onChange(def.key, v)} label={def.label} emptyLabel={editor.none} />
          </Field>
        );
      })}
    </div>
  );
}
