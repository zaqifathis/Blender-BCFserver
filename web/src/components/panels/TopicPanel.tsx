import { useState } from "preact/hooks";
import type { Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { TopicEditing } from "../../hooks/useTopicEditing";
import { ErrorMessage, StatusMessage } from "../common/StatusMessage";
import { TopicEditor } from "../editor/TopicEditor";
import { TopicDetail } from "../topic/TopicDetail";

type Props = {
  connected: boolean;
  projectId: string;
  topic?: Topic;
  editing: TopicEditing;
  extensions?: Extensions;
  labelOptions: string[];
  // Every topic of the project, unfiltered, for related topics
  topics: Topic[];
  canEdit: boolean;
};

export function TopicPanel({ connected, projectId, topic, editing, extensions, labelOptions, topics, canEdit }: Props) {
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
        topics={topics}
        onSaved={editing.saved}
        onCancel={editing.cancel}
      />
    );
  }
  if (!topic) {
    return (
      <>
        <ErrorMessage error={editing.error} />
        <StatusMessage>{STRINGS.main.selectTopic}</StatusMessage>
      </>
    );
  }
  return (
    <>
      <ErrorMessage error={editing.error} />
      <TopicDetail
        key={`${topic.guid}:${editing.revision}`}
        projectId={projectId}
        topic={topic}
        extensions={extensions}
        topics={topics}
        onSelectTopic={editing.select}
        newestFirst={newestFirst}
        onToggleOrder={() => setNewestFirst((n) => !n)}
        canEdit={canEdit}
        onEdit={editing.edit}
        onDelete={editing.remove}
      />
    </>
  );
}
