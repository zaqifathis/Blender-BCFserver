import { useRef, useState } from "preact/hooks";
import type { Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isSettled } from "../../hooks/useAsync";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useCommentEditing } from "../../hooks/useCommentEditing";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { canAddViewpoints } from "../../lib/topic";
import { ActionButtons } from "../common/ActionButtons";
import { StatusMessage } from "../common/StatusMessage";
import { CommentsSection } from "./CommentsSection";
import { DocumentsSection } from "./DocumentsSection";
import { FilesSection } from "./FilesSection";
import { RelatedTopicsSection } from "./RelatedTopicsSection";
import styles from "./TopicDetail.module.css";
import { TopicBadges } from "./TopicBadges";
import { TopicFacts } from "./TopicFacts";
import { ViewpointsSection } from "./ViewpointsSection";

type Props = {
  projectId: string;
  topic: Topic;
  extensions?: Extensions;
  // Every topic of the project, to name and open related topics
  topics: Topic[];
  onSelectTopic: (topicId: string) => void;
  newestFirst: boolean;
  onToggleOrder: () => void;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

// Mount once per topic (keyed by guid); stays hidden until comments, viewpoints, documents, files and related topics
// are in, so the layout does not shift as each part arrives
export function TopicDetail({
  projectId,
  topic,
  extensions,
  topics,
  onSelectTopic,
  newestFirst,
  onToggleOrder,
  canEdit,
  onEdit,
  onDelete,
}: Props) {
  const { comments, viewpoints, documentReferences, documents, files, relatedTopics, reloadComments, reloadViewpoints } = useTopicDetail(
    projectId,
    topic.guid,
    newestFirst,
  );
  const [commentId, setCommentId] = useState<string>();
  const selectedComment = comments.data?.find((c) => c.guid === commentId);
  // A click anywhere but the comments and the viewpoint clears the selected comment, back to the topic's viewpoints
  const commentsRef = useRef<HTMLElement>(null);
  const viewpointRef = useRef<HTMLElement>(null);
  useClickOutside([commentsRef, viewpointRef], Boolean(commentId), () => setCommentId(undefined));
  const commentEditing = useCommentEditing(projectId, topic.guid, selectedComment, setCommentId, reloadComments, reloadViewpoints);
  // The thumbnail picked below the large snapshot; the topic's first viewpoint until then
  const [pickedViewpointId, setPickedViewpointId] = useState<string>();
  const viewpointList = viewpoints.data ?? [];
  const topicViewpointId = viewpointList.some((vp) => vp.guid === pickedViewpointId) ? pickedViewpointId : viewpointList[0]?.guid;
  // A selected comment shows its own viewpoint only
  const viewpointId = selectedComment ? selectedComment.viewpoint_guid : topicViewpointId;
  const ready =
    isSettled(comments) &&
    isSettled(viewpoints) &&
    isSettled(documentReferences) &&
    isSettled(documents) &&
    isSettled(files) &&
    isSettled(relatedTopics);
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
          containerRef={commentsRef}
          projectId={projectId}
          topic={topic}
          extensions={extensions}
          comments={comments}
          viewpoints={viewpointList}
          newestFirst={newestFirst}
          onToggleOrder={onToggleOrder}
          selectedId={commentId}
          onSelect={setCommentId}
          editing={commentEditing}
        />
        <aside class={styles.aside}>
          <ViewpointsSection
            projectId={projectId}
            topicId={topic.guid}
            extensions={extensions}
            viewpoints={viewpointList}
            comments={comments.data ?? []}
            shownId={viewpointId}
            selectedComment={selectedComment}
            containerRef={viewpointRef}
            onPick={setPickedViewpointId}
            canAdd={canAddViewpoints(topic, extensions)}
            onAdded={(id) => {
              setCommentId(undefined);
              setPickedViewpointId(id);
              reloadViewpoints();
            }}
            onDeleted={() => {
              setCommentId(undefined);
              reloadViewpoints();
              reloadComments();
            }}
            onUnlinked={reloadComments}
          />
          <DocumentsSection projectId={projectId} references={documentReferences} documents={documents.data ?? []} />
          <FilesSection files={files} />
          <RelatedTopicsSection related={relatedTopics} topics={topics} onSelect={onSelectTopic} />
        </aside>
      </article>
    </>
  );
}
