import { useState } from "preact/hooks";
import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isSettled } from "../../hooks/useAsync";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { StatusMessage } from "../common/StatusMessage";
import { CommentsSection } from "./CommentsSection";
import { DocumentsSection } from "./DocumentsSection";
import styles from "./TopicDetail.module.css";
import { TopicBadges } from "./TopicBadges";
import { TopicFacts } from "./TopicFacts";
import { ViewpointSnapshot } from "./ViewpointSnapshot";

type Props = { projectId: string; topic: Topic; newestFirst: boolean; onToggleOrder: () => void };

// Mount once per topic (keyed by guid); stays hidden until comments, viewpoints, documents and snapshot are in,
// so the layout does not shift as each part arrives
export function TopicDetail({ projectId, topic, newestFirst, onToggleOrder }: Props) {
  const { comments, viewpoints, documentReferences, documents } = useTopicDetail(projectId, topic.guid, newestFirst);
  const [snapshotSettled, setSnapshotSettled] = useState(false);
  const firstViewpoint = viewpoints.data?.[0];
  const ready =
    isSettled(comments) &&
    isSettled(viewpoints) &&
    isSettled(documentReferences) &&
    isSettled(documents) &&
    (!firstViewpoint || snapshotSettled);

  return (
    <>
      {!ready && <StatusMessage>{STRINGS.common.loading}</StatusMessage>}
      <article class={styles.article} hidden={!ready}>
        <h2 class={styles.title}>{topic.title}</h2>
        <TopicBadges topic={topic} />
        <TopicFacts topic={topic} />
        {firstViewpoint && (
          <ViewpointSnapshot
            projectId={projectId}
            topicId={topic.guid}
            viewpointId={firstViewpoint.guid}
            onSettled={() => setSnapshotSettled(true)}
          />
        )}
        {topic.description && <p class={styles.description}>{topic.description}</p>}
        <DocumentsSection projectId={projectId} references={documentReferences} documents={documents.data ?? []} />
        <CommentsSection comments={comments} newestFirst={newestFirst} onToggleOrder={onToggleOrder} />
      </article>
    </>
  );
}
