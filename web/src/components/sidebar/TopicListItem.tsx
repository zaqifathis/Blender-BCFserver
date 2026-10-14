import type { Topic } from "../../api/types";
import { cx } from "../../lib/format";
import { Badge } from "../common/Badge";
import { MetaRow, MetaText } from "../common/MetaRow";
import styles from "./TopicListItem.module.css";

type Props = { topic: Topic; selected: boolean; onSelect: () => void };

export function TopicListItem({ topic, selected, onSelect }: Props) {
  return (
    <button class={cx(styles.topic, selected && styles.selected)} onClick={onSelect}>
      <span class={styles.title}>{topic.title}</span>
      <MetaRow>
        <Badge kind="status" value={topic.topic_status} />
        <Badge kind="prio" value={topic.priority} />
        {topic.assigned_to && <MetaText>{topic.assigned_to}</MetaText>}
      </MetaRow>
    </button>
  );
}
