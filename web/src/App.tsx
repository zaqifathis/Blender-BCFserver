import { getExtensions } from "./api/bcf";
import { HeaderBar } from "./components/panels/HeaderBar";
import { TopicPanel } from "./components/panels/TopicPanel";
import { TopicSidebar } from "./components/panels/TopicSidebar";
import { useAsync } from "./hooks/useAsync";
import { useConnection } from "./hooks/useConnection";
import { useProjects } from "./hooks/useProjects";
import { useResettableState } from "./hooks/useResettableState";
import { useTopicFilters } from "./hooks/useTopicFilters";
import { useTopicQuery } from "./hooks/useTopicQuery";
import { AppLayout } from "./layout/AppLayout";

export function App() {
  const connected = useConnection();
  const { projects, projectId, setProjectId } = useProjects(connected);
  const ready = connected && Boolean(projectId);

  const extensions = useAsync(ready ? () => getExtensions(projectId) : null, [connected, projectId]);
  const filters = useTopicFilters(projectId, extensions.data);
  const query = useTopicQuery(connected, projectId, filters.values);

  const [topicId, setTopicId] = useResettableState(projectId, "");
  const topic = query.topics.data?.find((t) => t.guid === topicId);

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
          onSelect={setTopicId}
        />
      }
      main={<TopicPanel connected={connected} projectId={projectId} topic={topic} />}
    />
  );
}
