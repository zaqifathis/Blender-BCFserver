import { useState } from "preact/hooks";
import type { Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { TopicEditing } from "../../hooks/useTopicEditing";
import { StatusMessage } from "../common/StatusMessage";
import { TopicEditor } from "../editor/TopicEditor";
import { TopicDetail } from "../topic/TopicDetail";

type Props = {
  connected: boolean;
  projectId: string;
  topic?: Topic;
  editing: TopicEditing;
  extensions?: Extensions;
  labelOptions: string[];
};

export function TopicPanel({ connected, projectId, topic, editing, extensions, labelOptions }: Props) {
  // Comment order is kept across topics
  const [newestFirst, setNewestFirst] = useState(false);

  if (!connected) return <StatusMessage>{STRINGS.main.waiting}</StatusMessage>;
  if (editing.mode === "create" || (editing.mode === "edit" && topic)) {
    const edited = editing.mode === "edit" ? topic : undefined;
    return (
      <TopicEditor
        key={edited?.guid ?? "new"}
        projectId={projectId}
        topic={edited}
        extensions={extensions}
        labelOptions={labelOptions}
        onSaved={editing.saved}
        onCancel={editing.cancel}
      />
    );
  }
  if (!topic) return <StatusMessage>{STRINGS.main.selectTopic}</StatusMessage>;
  return (
    <TopicDetail
      key={`${topic.guid}:${editing.revision}`}
      projectId={projectId}
      topic={topic}
      newestFirst={newestFirst}
      onToggleOrder={() => setNewestFirst((n) => !n)}
    />
  );
}
