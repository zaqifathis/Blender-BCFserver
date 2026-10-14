import { useState } from "preact/hooks";
import type { Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { isSettled } from "../../hooks/useAsync";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { StatusMessage } from "../common/StatusMessage";
import { CommentsSection } from "./CommentsSection";
import { DocumentsSection } from "./DocumentsSection";
import { FilesSection } from "./FilesSection";
import styles from "./TopicDetail.module.css";
import { TopicBadges } from "./TopicBadges";
import { TopicFacts } from "./TopicFacts";
import { ViewpointSnapshot } from "./ViewpointSnapshot";

type Props = { projectId: string; topic: Topic; newestFirst: boolean; onToggleOrder: () => void };

// Mount once per topic (keyed by guid); stays hidden until comments, viewpoints, documents, files and snapshot are in,
// so the layout does not shift as each part arrives
export function TopicDetail({ projectId, topic, newestFirst, onToggleOrder }: Props) {
  const { comments, viewpoints, documentReferences, documents, files } = useTopicDetail(projectId, topic.guid, newestFirst);
  const [snapshotSettled, setSnapshotSettled] = useState(false);
  const firstViewpoint = viewpoints.data?.[0];
  const ready =
    isSettled(comments) &&
    isSettled(viewpoints) &&
    isSettled(documentReferences) &&
    isSettled(documents) &&
    isSettled(files) &&
    (!firstViewpoint || snapshotSettled);

  return (
    <>
      {!ready && <StatusMessage>{STRINGS.common.loading}</StatusMessage>}
      <article class={styles.article} hidden={!ready}>
        <div class={styles.main}>
          <h2 class={styles.title}>{topic.title}</h2>
          <TopicBadges topic={topic} />
          <TopicFacts topic={topic} />
          {topic.description && <p class={styles.description}>{topic.description}</p>}
          <CommentsSection comments={comments} newestFirst={newestFirst} onToggleOrder={onToggleOrder} />
        </div>
        <aside class={styles.aside}>
          {firstViewpoint && (
            <ViewpointSnapshot
              projectId={projectId}
              topicId={topic.guid}
              viewpointId={firstViewpoint.guid}
              onSettled={() => setSnapshotSettled(true)}
            />
          )}
          <DocumentsSection projectId={projectId} references={documentReferences} documents={documents.data ?? []} />
          <FilesSection files={files} />
        </aside>
      </article>
    </>
  );
}
