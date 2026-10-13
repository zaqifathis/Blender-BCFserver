import { useEffect, useMemo, useState } from "preact/hooks";
import type { Comment, Extensions, Project, Topic, Viewpoint } from "./types";
import { onConnection, request } from "./ws";

const CLOSED = new Set(["closed", "resolved", "done"]);

// Topic filters from the BCF API "GET Topics" OData filter parameters; key is the OData property.
// "value" compares with eq, "list" matches any element of a string array, "date" is a day range.
type FilterDef = { key: string; label: string; kind: "value" | "list" | "date"; source?: keyof Extensions };
const FILTERS: FilterDef[] = [
  { key: "creation_author", label: "Created by", kind: "value", source: "users" },
  { key: "modified_author", label: "Modified by", kind: "value", source: "users" },
  { key: "assigned_to", label: "Assigned to", kind: "value", source: "users" },
  { key: "stage", label: "Stage", kind: "value", source: "stage" },
  { key: "topic_status", label: "Status", kind: "value", source: "topic_status" },
  { key: "topic_type", label: "Type", kind: "value", source: "topic_type" },
  { key: "priority", label: "Priority", kind: "value", source: "priority" },
  { key: "labels", label: "Label", kind: "list", source: "topic_label" },
  { key: "creation_date", label: "Created", kind: "date" },
  { key: "modified_date", label: "Modified", kind: "date" },
];
// A key is present once its filter was added from the menu; empty fields mean no constraint
type FilterValue = { value?: string; from?: string; to?: string };
type Filters = Record<string, FilterValue>;

// "GET Topics" OData sort parameters (deprecated index left out)
const TOPIC_SORTS: [string, string][] = [
  ["creation_date", "Created"],
  ["modified_date", "Modified"],
  ["server_assigned_id", "ID"],
];

const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

// Start of a local calendar day ("YYYY-MM-DD", plus offset days) as an OData datetime
function dayStart(day: string, offset = 0) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d + offset).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function toOData(filters: Filters) {
  return FILTERS.flatMap(({ key, kind }) => {
    const f = filters[key];
    if (!f) return [];
    if (kind === "date") {
      return [f.from && `${key} ge ${dayStart(f.from)}`, f.to && `${key} lt ${dayStart(f.to, 1)}`].filter(Boolean);
    }
    if (!f.value) return [];
    return [kind === "list" ? `${key}/any(x: x eq ${literal(f.value)})` : `${key} eq ${literal(f.value)}`];
  }).join(" and ");
}

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

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </svg>
  );
}

export function App() {
  const [connected, setConnected] = useState(false);
  useEffect(() => onConnection(setConnected), []);

  const [projectId, setProjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortField, setSortField] = useState("creation_date");
  const [sortDesc, setSortDesc] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  const projects = useAsync<Project[]>(connected ? () => request("projects.list") : null, [connected]);
  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].project_id);
  }, [projects.data]);

  const filter = toOData(filters);
  const orderby = `${sortField} ${sortDesc ? "desc" : "asc"}`;
  const topics = useAsync<Topic[]>(
    connected && projectId ? () => request("topics.list", { project_id: projectId, filter, orderby }) : null,
    [connected, projectId, filter, orderby],
  );
  const extensions = useAsync<Extensions>(
    connected && projectId ? () => request("extensions.get", { project_id: projectId }) : null,
    [connected, projectId],
  );
  useEffect(() => {
    setTopicId("");
    setFilters({});
    setMenuOpen(false);
  }, [projectId]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !(e.target as Element).closest(".filter-bar") && setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  // Only offer value filters the project defines values for
  const options = (def: FilterDef) => (def.source ? (extensions.data?.[def.source] ?? []) : []);
  const available = FILTERS.filter((def) => def.kind === "date" || options(def).length > 0);
  const addable = available.filter(({ key }) => !(key in filters));
  const active = available.filter(({ key }) => key in filters);
  const isSet = (key: string) => Object.values(filters[key] ?? {}).some(Boolean);
  const setFilter = (key: string, change: FilterValue) => setFilters((f) => ({ ...f, [key]: { ...f[key], ...change } }));
  const removeFilter = (key: string) =>
    setFilters((f) => {
      const { [key]: _, ...rest } = f;
      return rest;
    });
  // Filters and sorting run on the server; text search and hiding closed topics stay local
  const status = filters.topic_status?.value;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (topics.data ?? [])
      .filter((t) => showClosed || status || !CLOSED.has((t.topic_status ?? "").toLowerCase()))
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
        <div class="filter-bar">
          <input type="search" placeholder="Search topics" value={query} onInput={(e) => setQuery(val(e))} />
          <button
            class={active.some(({ key }) => isSet(key)) ? "icon-btn set" : "icon-btn"}
            onClick={() => setMenuOpen((o) => !o)}
            disabled={addable.length === 0}
            title={addable.length ? "Add filter" : "No more filters"}
            aria-label="Add filter"
            aria-expanded={menuOpen}
          >
            <FilterIcon />
          </button>
          {menuOpen && addable.length > 0 && (
            <ul class="menu" role="menu">
              {addable.map(({ key, label }) => (
                <li>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setFilter(key, {});
                      setMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {active.length > 0 && (
          <div class="filters">
            {active.map((def) => (
              <div class="filter">
                <span>{def.label}</span>
                {def.kind === "date" ? (
                  <span class="range">
                    {(["from", "to"] as const).map((end) => (
                      <input
                        type="date"
                        value={filters[def.key][end] ?? ""}
                        onChange={(e) => setFilter(def.key, { [end]: val(e) })}
                        aria-label={`${def.label} ${end}`}
                        title={end === "from" ? "From" : "To"}
                        class={filters[def.key][end] ? "set" : ""}
                      />
                    ))}
                  </span>
                ) : (
                  <select
                    value={filters[def.key].value ?? ""}
                    onChange={(e) => setFilter(def.key, { value: val(e) })}
                    aria-label={def.label}
                    class={filters[def.key].value ? "set" : ""}
                  >
                    <option value="">All</option>
                    {options(def).map((v) => (
                      <option value={v}>{v}</option>
                    ))}
                  </select>
                )}
                <button class="icon-btn" onClick={() => removeFilter(def.key)} title={`Remove ${def.label} filter`} aria-label={`Remove ${def.label} filter`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {extensions.error && <p class="error">{extensions.error}</p>}
        <div class="filter sort">
          <span>Sort</span>
          <select value={sortField} onChange={(e) => setSortField(val(e))} aria-label="Sort topics by">
            {TOPIC_SORTS.map(([key, label]) => (
              <option value={key}>{label}</option>
            ))}
          </select>
          <button
            class="icon-btn"
            onClick={() => setSortDesc((d) => !d)}
            title={sortDesc ? "Descending" : "Ascending"}
            aria-label={sortDesc ? "Sort descending" : "Sort ascending"}
          >
            {sortDesc ? "↓" : "↑"}
          </button>
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
  const [newestFirst, setNewestFirst] = useState(false);
  const comments = useAsync<Comment[]>(
    () => request("comments.list", { project_id: projectId, topic_id: topic.guid, orderby: `date ${newestFirst ? "desc" : "asc"}` }),
    [topic.guid, newestFirst],
  );
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
      <h3 class="comments-head">
        Comments{comments.data ? ` (${comments.data.length})` : ""}
        <button class="link" onClick={() => setNewestFirst((n) => !n)} title="Change comment order">
          {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
        </button>
      </h3>
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
