import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { formatDate } from "../../lib/format";
import styles from "./TopicFacts.module.css";

type Fact = { label: string; value: (t: Topic) => string | undefined };

// Rows shown when the topic has a value for them
const FACTS: Fact[] = [
  { label: STRINGS.topic.assigned, value: (t) => t.assigned_to },
  { label: STRINGS.topic.created, value: (t) => t.creation_author && `${t.creation_author}, ${formatDate(t.creation_date)}` },
  { label: STRINGS.topic.due, value: (t) => t.due_date && formatDate(t.due_date) },
];

export function TopicFacts({ topic }: { topic: Topic }) {
  const rows = FACTS.map(({ label, value }) => ({ label, value: value(topic) })).filter((r) => r.value);
  return (
    <dl class={styles.facts}>
      {rows.map(({ label, value }) => (
        <>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </>
      ))}
    </dl>
  );
}
