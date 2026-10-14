import { listComments, listViewpoints } from "../api/bcf";
import { COMMENT_SORT_FIELD } from "../config/topicSorts";
import { toODataOrderBy } from "../lib/odata";
import { useAsync } from "./useAsync";

export function useTopicDetail(projectId: string, topicId: string, newestFirst: boolean) {
  const orderby = toODataOrderBy({ field: COMMENT_SORT_FIELD, desc: newestFirst });
  const comments = useAsync(() => listComments(projectId, topicId, orderby), [topicId, orderby]);
  const viewpoints = useAsync(() => listViewpoints(projectId, topicId), [topicId]);
  return { comments, viewpoints };
}
