import { listComments, listDocumentReferences, listDocuments, listViewpoints } from "../api/bcf";
import { COMMENT_SORT_FIELD } from "../config/topicSorts";
import { toODataOrderBy } from "../lib/odata";
import { useAsync } from "./useAsync";

export function useTopicDetail(projectId: string, topicId: string, newestFirst: boolean) {
  const orderby = toODataOrderBy({ field: COMMENT_SORT_FIELD, desc: newestFirst });
  const comments = useAsync(() => listComments(projectId, topicId, orderby), [topicId, orderby]);
  const viewpoints = useAsync(() => listViewpoints(projectId, topicId), [topicId]);
  const documentReferences = useAsync(() => listDocumentReferences(projectId, topicId), [topicId]);
  // Only for filenames; a server without the Documents API still lists the references
  const documents = useAsync(() => listDocuments(projectId).catch(() => []), [projectId]);
  return { comments, viewpoints, documentReferences, documents };
}
