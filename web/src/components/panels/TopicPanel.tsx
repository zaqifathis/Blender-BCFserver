import { useState } from "preact/hooks";
import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { StatusMessage } from "../common/StatusMessage";
import { TopicDetail } from "../topic/TopicDetail";

type Props = { connected: boolean; projectId: string; topic?: Topic };

export function TopicPanel({ connected, projectId, topic }: Props) {
  // Comment order is kept across topics
  const [newestFirst, setNewestFirst] = useState(false);

  if (!connected) return <StatusMessage>{STRINGS.main.waiting}</StatusMessage>;
  if (!topic) return <StatusMessage>{STRINGS.main.selectTopic}</StatusMessage>;
  return (
    <TopicDetail
      key={topic.guid}
      projectId={projectId}
      topic={topic}
      newestFirst={newestFirst}
      onToggleOrder={() => setNewestFirst((n) => !n)}
    />
  );
}
