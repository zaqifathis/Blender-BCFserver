import { useMemo, useState } from "preact/hooks";
import { listTopics } from "../api/bcf";
import type { Topic } from "../api/types";
import { STATUS_FILTER_KEY, type Filters } from "../config/topicFilters";
import { DEFAULT_TOPIC_SORT, type Sort } from "../config/topicSorts";
import { toODataFilter, toODataOrderBy } from "../lib/odata";
import { isClosed } from "../lib/topic";
import { useAsync } from "./useAsync";

export type TopicQuery = ReturnType<typeof useTopicQuery>;

const searchText = (t: Topic) => `${t.title} ${t.description ?? ""} ${t.assigned_to ?? ""}`.toLowerCase();

// Filters and sorting run on the server; text search and hiding closed topics stay local
export function useTopicQuery(connected: boolean, projectId: string, filters: Filters) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>(DEFAULT_TOPIC_SORT);
  const [showClosed, setShowClosed] = useState(false);
  // Bumped to refetch after a topic was added, edited or deleted
  const [revision, setRevision] = useState(0);

  const filter = toODataFilter(filters);
  const orderby = toODataOrderBy(sort);
  const topics = useAsync(connected && projectId ? () => listTopics(projectId, filter, orderby) : null, [
    connected,
    projectId,
    filter,
    orderby,
    revision,
  ]);

  // An explicit status filter overrides hiding closed topics
  const statusFiltered = Boolean(filters[STATUS_FILTER_KEY]?.value);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (topics.data ?? [])
      .filter((t) => showClosed || statusFiltered || !isClosed(t))
      .filter((t) => !q || searchText(t).includes(q));
  }, [topics.data, search, statusFiltered, showClosed]);

  const reload = () => setRevision((r) => r + 1);
  return { topics, visible, search, setSearch, sort, setSort, showClosed, setShowClosed, revision, reload };
}
