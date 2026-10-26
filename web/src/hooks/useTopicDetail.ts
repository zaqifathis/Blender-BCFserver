import { useState } from "preact/hooks";
import { listComments, listDocumentReferences, listDocuments, listFiles, listRelatedTopics, listViewpoints } from "../api/bcf";
import { COMMENT_SORT_FIELD } from "../config/topicSorts";
import { toODataOrderBy } from "../lib/odata";
import { useAsync } from "./useAsync";

export function useTopicDetail(projectId: string, topicId: string, newestFirst: boolean) {
  const orderby = toODataOrderBy({ field: COMMENT_SORT_FIELD, desc: newestFirst });
  // Bumped to refetch the comments after one was added, edited or deleted
  const [commentsRevision, setCommentsRevision] = useState(0);
  const comments = useAsync(() => listComments(projectId, topicId, orderby), [topicId, orderby, commentsRevision]);
  // Bumped to refetch the viewpoints after one was added
  const [viewpointsRevision, setViewpointsRevision] = useState(0);
  // In index order; those without an index keep the server's order, after the others
  const viewpoints = useAsync(
    () => listViewpoints(projectId, topicId).then((list) => [...list].sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity))),
    [topicId, viewpointsRevision],
  );
  const documentReferences = useAsync(() => listDocumentReferences(projectId, topicId), [topicId]);
  // Only for filenames; a server without the Documents API still lists the references
  const documents = useAsync(() => listDocuments(projectId).catch(() => []), [projectId]);
  const files = useAsync(() => listFiles(projectId, topicId), [topicId]);
  const relatedTopics = useAsync(() => listRelatedTopics(projectId, topicId), [topicId]);
  const reloadComments = () => setCommentsRevision((r) => r + 1);
  const reloadViewpoints = () => setViewpointsRevision((r) => r + 1);
  return { comments, viewpoints, documentReferences, documents, files, relatedTopics, reloadComments, reloadViewpoints };
}
