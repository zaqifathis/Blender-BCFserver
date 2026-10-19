import { useState } from "preact/hooks";
import type { Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isSettled } from "../../hooks/useAsync";
import { useCommentEditing } from "../../hooks/useCommentEditing";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { cx } from "../../lib/format";
import { ActionButtons } from "../common/ActionButtons";
import { StatusMessage } from "../common/StatusMessage";
import { CommentsSection } from "./CommentsSection";
import { DocumentsSection } from "./DocumentsSection";
import { FilesSection } from "./FilesSection";
import styles from "./TopicDetail.module.css";
import { TopicBadges } from "./TopicBadges";
import { TopicFacts } from "./TopicFacts";
import { ViewpointSnapshot } from "./ViewpointSnapshot";

type Props = {
  projectId: string;
  topic: Topic;
  extensions?: Extensions;
  newestFirst: boolean;
  onToggleOrder: () => void;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

// Mount once per topic (keyed by guid); stays hidden until comments, viewpoints, documents, files and snapshot are in,
// so the layout does not shift as each part arrives
export function TopicDetail({ projectId, topic, extensions, newestFirst, onToggleOrder, canEdit, onEdit, onDelete }: Props) {
  const { comments, viewpoints, documentReferences, documents, files, reloadComments } = useTopicDetail(
    projectId,
    topic.guid,
    newestFirst,
  );
  // Snapshot outcome per viewpoint: true once shown, false when it has none
  const [snapshots, setSnapshots] = useState<Record<string, boolean>>({});
  const [commentId, setCommentId] = useState<string>();
  const selectedComment = comments.data?.find((c) => c.guid === commentId);
  const commentEditing = useCommentEditing(projectId, topic.guid, selectedComment, setCommentId, reloadComments);
  const firstViewpoint = viewpoints.data?.[0];
  // The selected comment's viewpoint replaces the topic's first one
  const viewpointId = selectedComment?.viewpoint_guid ?? firstViewpoint?.guid;
  const hasSnapshot = Boolean(viewpointId) && snapshots[viewpointId!] !== false;
  const ready =
    isSettled(comments) &&
    isSettled(viewpoints) &&
    isSettled(documentReferences) &&
    isSettled(documents) &&
    isSettled(files) &&
    (!firstViewpoint || firstViewpoint.guid in snapshots);
  const { actions } = STRINGS;
  const allowed = (title: string) => (canEdit ? title : actions.notAllowed);

  return (
    <>
      {!ready && <StatusMessage>{STRINGS.common.loading}</StatusMessage>}
      <article class={styles.article} hidden={!ready}>
        <header class={styles.header}>
          <div class={styles.titleRow}>
            <h2 class={styles.title}>{topic.title}</h2>
            <ActionButtons
              edit={{ label: actions.editTopic, title: allowed(actions.editTopic), disabled: !canEdit, onClick: onEdit }}
              remove={{ label: actions.deleteTopic, title: allowed(actions.deleteTopic), disabled: !canEdit, onClick: onDelete }}
            />
          </div>
          <TopicBadges topic={topic} />
          <TopicFacts topic={topic} />
          {topic.description && <p class={styles.description}>{topic.description}</p>}
        </header>
        <CommentsSection
          class={styles.comments}
          topic={topic}
          extensions={extensions}
          comments={comments}
          newestFirst={newestFirst}
          onToggleOrder={onToggleOrder}
          selectedId={commentId}
          onSelect={setCommentId}
          editing={commentEditing}
        />
        {/* Without a snapshot, documents and files start level with the comments */}
        <aside class={cx(styles.aside, !hasSnapshot && styles.besideComments)}>
          {viewpointId && (
            <ViewpointSnapshot
              key={viewpointId}
              projectId={projectId}
              topicId={topic.guid}
              viewpointId={viewpointId}
              onSettled={(shown) => setSnapshots((s) => ({ ...s, [viewpointId]: shown }))}
            />
          )}
          <DocumentsSection projectId={projectId} references={documentReferences} documents={documents.data ?? []} />
          <FilesSection files={files} />
        </aside>
      </article>
    </>
  );
}
