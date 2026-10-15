import { STRINGS } from "../../config/strings";
import type { TopicEditing } from "../../hooks/useTopicEditing";
import type { TopicFilters } from "../../hooks/useTopicFilters";
import type { TopicQuery } from "../../hooks/useTopicQuery";
import { ErrorMessage, StatusMessage } from "../common/StatusMessage";
import { FilterList } from "../sidebar/FilterList";
import { ShowClosedToggle } from "../sidebar/ShowClosedToggle";
import { SortControl } from "../sidebar/SortControl";
import { TopicActions } from "../sidebar/TopicActions";
import { TopicList } from "../sidebar/TopicList";
import { TopicSearchBar } from "../sidebar/TopicSearchBar";

type Props = {
  connected: boolean;
  projectId: string;
  filters: TopicFilters;
  extensionsError?: string;
  query: TopicQuery;
  selectedId: string;
  canEdit: boolean;
  editing: TopicEditing;
};

export function TopicSidebar({ connected, projectId, filters, extensionsError, query, selectedId, canEdit, editing }: Props) {
  const { topics, visible } = query;
  return (
    <>
      <TopicSearchBar search={query.search} onSearch={query.setSearch} filters={filters} resetKey={projectId} />
      <FilterList filters={filters} />
      <ErrorMessage error={extensionsError} />
      <SortControl sort={query.sort} onChange={query.setSort} />
      <ShowClosedToggle checked={query.showClosed} onChange={query.setShowClosed} />
      <TopicActions
        canEdit={canEdit}
        hasSelection={Boolean(selectedId)}
        onAdd={editing.add}
        onEdit={editing.edit}
        onDelete={editing.remove}
      />
      <ErrorMessage error={editing.error} />
      <ErrorMessage error={topics.error} />
      {topics.loading && <StatusMessage>{STRINGS.common.loading}</StatusMessage>}
      <TopicList topics={visible} selectedId={selectedId} onSelect={editing.select} />
      {!topics.loading && connected && visible.length === 0 && <StatusMessage>{STRINGS.sidebar.noTopics}</StatusMessage>}
    </>
  );
}
