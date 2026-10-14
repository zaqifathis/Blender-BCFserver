import { useMemo, useState } from "preact/hooks";
import { listTopics } from "../api/bcf";
import type { Topic } from "../api/types";
import { STATUS_FILTER_KEY, type Filters } from "../config/topicFilters";
import { DEFAULT_TOPIC_SORT, type Sort } from "../config/topicSorts";
import { CLOSED_STATUSES } from "../config/topicStatus";
import { toODataFilter, toODataOrderBy } from "../lib/odata";
import { useAsync } from "./useAsync";

export type TopicQuery = ReturnType<typeof useTopicQuery>;

const isClosed = (t: Topic) => CLOSED_STATUSES.has((t.topic_status ?? "").toLowerCase());
const searchText = (t: Topic) => `${t.title} ${t.description ?? ""} ${t.assigned_to ?? ""}`.toLowerCase();

// Filters and sorting run on the server; text search and hiding closed topics stay local
export function useTopicQuery(connected: boolean, projectId: string, filters: Filters) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>(DEFAULT_TOPIC_SORT);
  const [showClosed, setShowClosed] = useState(false);

  const filter = toODataFilter(filters);
  const orderby = toODataOrderBy(sort);
  const topics = useAsync(connected && projectId ? () => listTopics(projectId, filter, orderby) : null, [
    connected,
    projectId,
    filter,
    orderby,
  ]);

  // An explicit status filter overrides hiding closed topics
  const statusFiltered = Boolean(filters[STATUS_FILTER_KEY]?.value);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (topics.data ?? [])
      .filter((t) => showClosed || statusFiltered || !isClosed(t))
      .filter((t) => !q || searchText(t).includes(q));
  }, [topics.data, search, statusFiltered, showClosed]);

  return { topics, visible, search, setSearch, sort, setSort, showClosed, setShowClosed };
}
