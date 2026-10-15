import type { Topic } from "../../api/types";
import { cx } from "../../lib/format";
import { MetaRow } from "../common/MetaRow";
import { TopicKindBadges } from "../topic/TopicKindBadges";
import styles from "./TopicListItem.module.css";

type Props = { topic: Topic; selected: boolean; onSelect: () => void };

export function TopicListItem({ topic, selected, onSelect }: Props) {
  return (
    <button class={cx(styles.topic, selected && styles.selected)} onClick={onSelect}>
      <span class={styles.title}>{topic.title}</span>
      <MetaRow>
        <TopicKindBadges topic={topic} />
      </MetaRow>
    </button>
  );
}
