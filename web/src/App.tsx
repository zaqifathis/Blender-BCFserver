import { useEffect, useMemo, useState } from "preact/hooks";
import type { Comment, Project, Topic, Viewpoint } from "./types";
import { onConnection, request } from "./ws";

const CLOSED = new Set(["closed", "resolved", "done"]);

function useAsync<T>(fn: (() => Promise<T>) | null, deps: unknown[]) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: false });
  useEffect(() => {
    if (!fn) return set({ loading: false });
    let live = true;
    set((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => live && set({ data, loading: false }),
      (e: Error) => live && set({ error: e.message, loading: false }),
    );
    return () => {
      live = false;
    };
  }, deps);
  return state;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Badge({ kind, value }: { kind: string; value?: string }) {
  if (!value) return null;
  return <span class={`badge ${kind}-${value.toLowerCase().replace(/\W+/g, "-")}`}>{value}</span>;
}

const val = (e: Event) => (e.target as HTMLInputElement).value;

export function App() {
  const [connected, setConnected] = useState(false);
  useEffect(() => onConnection(setConnected), []);

  const [projectId, setProjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const projects = useAsync<Project[]>(connected ? () => request("projects.list") : null, [connected]);
  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].project_id);
  }, [projects.data]);

  const topics = useAsync<Topic[]>(
    connected && projectId ? () => request("topics.list", { project_id: projectId }) : null,
    [connected, projectId],
  );
  useEffect(() => setTopicId(""), [projectId]);

  const statuses = useMemo(
    () => [...new Set((topics.data ?? []).map((t) => t.topic_status).filter((s): s is string => !!s))],
    [topics.data],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (topics.data ?? [])
      .filter((t) => showClosed || status || !CLOSED.has((t.topic_status ?? "").toLowerCase()))
      .filter((t) => !status || t.topic_status === status)
      .filter((t) => !q || `${t.title} ${t.description ?? ""} ${t.assigned_to ?? ""}`.toLowerCase().includes(q));
  }, [topics.data, query, status, showClosed]);
  const topic = topics.data?.find((t) => t.guid === topicId);

  return (
    <div class="app">
      <header>
        <h1>BCF</h1>
        <select value={projectId} onChange={(e) => setProjectId(val(e))} aria-label="Project">
          {(projects.data ?? []).map((p) => (
            <option value={p.project_id}>{p.name}</option>
          ))}
        </select>
        <span class={`dot ${connected ? "on" : "off"}`} title={connected ? "Connected to Blender" : "Waiting for Blender…"} />
      </header>

      <aside>
        <input type="search" placeholder="Search topics" value={query} onInput={(e) => setQuery(val(e))} />
        <div class="chips">
          <button class={!status ? "chip active" : "chip"} onClick={() => setStatus("")}>
            All
          </button>
          {statuses.map((s) => (
            <button class={status === s ? "chip active" : "chip"} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
        <label class="check">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed((e.target as HTMLInputElement).checked)} /> Show closed
        </label>
        {topics.error && <p class="error">{topics.error}</p>}
        {topics.loading && <p class="muted">Loading…</p>}
        <ul class="topics">
          {visible.map((t) => (
            <li>
              <button class={t.guid === topicId ? "topic active" : "topic"} onClick={() => setTopicId(t.guid)}>
                <span class="title">{t.title}</span>
                <span class="meta">
                  <Badge kind="status" value={t.topic_status} />
                  <Badge kind="prio" value={t.priority} />
                  {t.assigned_to && <span class="muted">{t.assigned_to}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!topics.loading && connected && visible.length === 0 && <p class="muted">No topics</p>}
      </aside>

      <main>
        {!connected && <p class="muted">Waiting for Blender…</p>}
        {connected && !topic && <p class="muted">Select a topic</p>}
        {topic && <Detail projectId={projectId} topic={topic} />}
      </main>
    </div>
  );
}

function Detail({ projectId, topic }: { projectId: string; topic: Topic }) {
  const comments = useAsync<Comment[]>(() => request("comments.list", { project_id: projectId, topic_id: topic.guid }), [topic.guid]);
  const viewpoints = useAsync<Viewpoint[]>(() => request("viewpoints.list", { project_id: projectId, topic_id: topic.guid }), [topic.guid]);
  const snap = (vp: string) =>
    `/api/snapshot/${encodeURIComponent(projectId)}/${encodeURIComponent(topic.guid)}/${encodeURIComponent(vp)}`;

  return (
    <article>
      <h2>{topic.title}</h2>
      <div class="meta">
        <Badge kind="status" value={topic.topic_status} />
        <Badge kind="prio" value={topic.priority} />
        <Badge kind="type" value={topic.topic_type} />
        {(topic.labels ?? []).map((l) => (
          <Badge kind="label" value={l} />
        ))}
      </div>
      <dl>
        {topic.assigned_to && (
          <>
            <dt>Assigned</dt>
            <dd>{topic.assigned_to}</dd>
          </>
        )}
        {topic.creation_author && (
          <>
            <dt>Created</dt>
            <dd>
              {topic.creation_author}, {fmtDate(topic.creation_date)}
            </dd>
          </>
        )}
        {topic.due_date && (
          <>
            <dt>Due</dt>
            <dd>{fmtDate(topic.due_date)}</dd>
          </>
        )}
      </dl>
      {viewpoints.data?.[0] && (
        <img
          class="snapshot"
          src={snap(viewpoints.data[0].guid)}
          alt="Viewpoint snapshot"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      {topic.description && <p class="desc">{topic.description}</p>}
      <h3>Comments{comments.data ? ` (${comments.data.length})` : ""}</h3>
      {comments.error && <p class="error">{comments.error}</p>}
      <ul class="comments">
        {(comments.data ?? []).map((c) => (
          <li>
            <div class="who">
              <strong>{c.author ?? "Unknown"}</strong> <span class="muted">{fmtDate(c.date)}</span>
            </div>
            <p>{c.comment}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
