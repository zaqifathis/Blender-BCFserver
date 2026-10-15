import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isOverdue } from "../../lib/topic";
import { Badge } from "../common/Badge";

// Overdue flag, then status, priority, stage and type; shared by the topic list and the topic detail
export function TopicKindBadges({ topic }: { topic: Topic }) {
  return (
    <>
      {isOverdue(topic) && <Badge kind="due" value={STRINGS.topic.overdue} />}
      <Badge kind="status" value={topic.topic_status} />
      <Badge kind="prio" value={topic.priority} />
      <Badge kind="stage" value={topic.stage} />
      <Badge kind="type" value={topic.topic_type} />
    </>
  );
}
