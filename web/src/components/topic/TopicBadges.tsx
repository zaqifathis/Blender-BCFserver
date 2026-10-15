import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isOverdue } from "../../lib/topic";
import { Badge } from "../common/Badge";
import { MetaRow } from "../common/MetaRow";

export function TopicBadges({ topic }: { topic: Topic }) {
  return (
    <MetaRow>
      {isOverdue(topic) && <Badge kind="due" value={STRINGS.topic.overdue} />}
      <Badge kind="status" value={topic.topic_status} />
      <Badge kind="prio" value={topic.priority} />
      <Badge kind="type" value={topic.topic_type} />
      {(topic.labels ?? []).map((l) => (
        <Badge kind="label" value={l} />
      ))}
    </MetaRow>
  );
}
