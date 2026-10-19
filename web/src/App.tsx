import { useEffect } from "preact/hooks";
import { getExtensions, listTopics } from "./api/bcf";
import type { Topic } from "./api/types";
import { HeaderBar } from "./components/panels/HeaderBar";
import { TopicPanel } from "./components/panels/TopicPanel";
import { TopicSidebar } from "./components/panels/TopicSidebar";
import { useAsync } from "./hooks/useAsync";
import { useConnection } from "./hooks/useConnection";
import { useProjects } from "./hooks/useProjects";
import { useResettableState } from "./hooks/useResettableState";
import { useTopicEditing } from "./hooks/useTopicEditing";
import { useTopicFilters } from "./hooks/useTopicFilters";
import { useTopicLabels } from "./hooks/useTopicLabels";
import { useTopicQuery } from "./hooks/useTopicQuery";
import { AppLayout } from "./layout/AppLayout";
import { canEditTopics, knownLabels } from "./lib/topic";

export function App() {
  const connected = useConnection();
  const { projects, projectId, setProjectId } = useProjects(connected);
  const ready = connected && Boolean(projectId);

  const extensions = useAsync(ready ? () => getExtensions(projectId) : null, [connected, projectId]);
  const [labels, trackLabels] = useTopicLabels(projectId);
  const filters = useTopicFilters(projectId, extensions.data, labels);
  const query = useTopicQuery(connected, projectId, filters.values);
  useEffect(() => trackLabels(query.topics.data), [query.topics.data]);

  // Unfiltered, for related topics: they may be closed or hidden by the sidebar filters
  const allTopics = useAsync(ready ? () => listTopics(projectId, "", "") : null, [connected, projectId, query.revision]);

  const [topicId, setTopicId] = useResettableState(projectId, "");
  // A related topic opened from the detail may be missing from the filtered list
  const find = (topics?: Topic[]) => topics?.find((t) => t.guid === topicId);
  const topic = find(query.topics.data) ?? find(allTopics.data);
  const editing = useTopicEditing(projectId, topic, setTopicId, query.reload);
  const canEdit = canEditTopics(extensions.data);

  return (
    <AppLayout
      header={<HeaderBar connected={connected} projects={projects} projectId={projectId} onProjectChange={setProjectId} />}
      sidebar={
        <TopicSidebar
          connected={connected}
          projectId={projectId}
          filters={filters}
          extensionsError={extensions.error}
          query={query}
          selectedId={topicId}
          canEdit={canEdit}
          editing={editing}
        />
      }
      main={
        <TopicPanel
          connected={connected}
          projectId={projectId}
          topic={topic}
          editing={editing}
          extensions={extensions.data}
          labelOptions={knownLabels(extensions.data?.topic_label, labels)}
          topics={allTopics.data ?? []}
          canEdit={canEdit}
        />
      }
    />
  );
}
