import { useState } from "preact/hooks";
import { listComments, listDocumentReferences, listDocuments, listFiles, listViewpoints } from "../api/bcf";
import { COMMENT_SORT_FIELD } from "../config/topicSorts";
import { toODataOrderBy } from "../lib/odata";
import { useAsync } from "./useAsync";

export function useTopicDetail(projectId: string, topicId: string, newestFirst: boolean) {
  const orderby = toODataOrderBy({ field: COMMENT_SORT_FIELD, desc: newestFirst });
  // Bumped to refetch the comments after one was added, edited or deleted
  const [commentsRevision, setCommentsRevision] = useState(0);
  const comments = useAsync(() => listComments(projectId, topicId, orderby), [topicId, orderby, commentsRevision]);
  const viewpoints = useAsync(() => listViewpoints(projectId, topicId), [topicId]);
  const documentReferences = useAsync(() => listDocumentReferences(projectId, topicId), [topicId]);
  // Only for filenames; a server without the Documents API still lists the references
  const documents = useAsync(() => listDocuments(projectId).catch(() => []), [projectId]);
  const files = useAsync(() => listFiles(projectId, topicId), [topicId]);
  const reloadComments = () => setCommentsRevision((r) => r + 1);
  return { comments, viewpoints, documentReferences, documents, files, reloadComments };
}
