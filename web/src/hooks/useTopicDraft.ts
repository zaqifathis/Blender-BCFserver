import { useState } from "preact/hooks";
import { createTopic, listRelatedTopics, updateRelatedTopics, updateTopic } from "../api/bcf";
import type { Extensions, Topic, TopicPost, TopicPut } from "../api/types";
import { STRINGS } from "../config/strings";
import { fromDateTimeInput, toDateTimeInput } from "../lib/format";
import { canUpdateRelatedTopics } from "../lib/topic";
import { useAsync } from "./useAsync";

// Form values; empty strings mean "not set"
export type TopicFields = {
  title: string;
  description: string;
  labels: string[];
  topic_type: string;
  priority: string;
  topic_status: string;
  due_date: string; // datetime-local value, in local time
  assigned_to: string;
  stage: string;
};

// "Open" as the project spells it, when the project has that status
const openStatus = (extensions?: Extensions) => extensions?.topic_status?.find((s) => s.toLowerCase() === "open") ?? "";

// A topic without a status starts at Open when the project has it; otherwise it stays unset (null on save)
const toFields = (t: Topic | undefined, extensions?: Extensions): TopicFields => ({
  title: t?.title ?? "",
  description: t?.description ?? "",
  labels: t?.labels ?? [],
  topic_type: t?.topic_type ?? "",
  priority: t?.priority ?? "",
  topic_status: t?.topic_status || openStatus(extensions),
  due_date: toDateTimeInput(t?.due_date),
  assigned_to: t?.assigned_to ?? "",
  stage: t?.stage ?? "",
});

const orNull = (s: string) => s.trim() || null;

// New topic: only the fields the user set; the server fills in the rest
function toPost(f: TopicFields): TopicPost {
  const body: TopicPost = { title: f.title.trim() };
  for (const key of ["description", "topic_type", "priority", "topic_status", "assigned_to", "stage"] as const) {
    const value = f[key].trim();
    if (value) body[key] = value;
  }
  if (f.due_date) body.due_date = fromDateTimeInput(f.due_date);
  if (f.labels.length) body.labels = f.labels;
  return body;
}

// Edited topic: PUT replaces the whole topic, so the body is a full copy of it. Fields the form does not
// show keep their current value; form fields take the form's value, and an emptied one (a select set to
// "—", a cleared deadline) is sent as null so the server clears it.
function toPut(f: TopicFields, original: Topic): TopicPut {
  // The server wants an ISO-8601 datetime; an untouched one goes back as stored (keeping its seconds),
  // anything else, e.g. an old date-only value, is rewritten from the input
  const untouched = f.due_date === toDateTimeInput(original.due_date) && original.due_date?.includes("T");
  const due = untouched ? original.due_date! : fromDateTimeInput(f.due_date);
  return {
    // Not in the form: copied as they are
    reference_links: original.reference_links ?? null,
    index: original.index ?? null,
    ...(original.bim_snippet && { bim_snippet: original.bim_snippet }),
    // In the form
    title: f.title.trim(),
    description: orNull(f.description),
    labels: f.labels,
    topic_type: orNull(f.topic_type),
    priority: orNull(f.priority),
    topic_status: orNull(f.topic_status),
    due_date: orNull(due),
    assigned_to: orNull(f.assigned_to),
    stage: orNull(f.stage),
  };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Related topics have their own PUT, sent after the topic is saved: it needs the topic's guid, which a
// new topic only gets from its POST
function useRelatedDraft(projectId: string, topic: Topic | undefined, extensions: Extensions | undefined) {
  const allowed = canUpdateRelatedTopics(topic, extensions);
  const stored = useAsync(topic ? () => listRelatedTopics(projectId, topic.guid) : null, []);
  // As stored on the server; undefined until loaded, or when loading failed
  const original = topic ? stored.data?.map((r) => r.related_topic_guid) : [];
  // undefined until the user changes the list
  const [edited, setEdited] = useState<string[]>();
  const value = edited ?? original ?? [];
  const changed = allowed && original !== undefined && edited !== undefined && !sameSet(edited, original);

  // Returns an error message when the topic was saved but its related topics were not
  const save = async (topicId: string) => {
    if (!changed) return undefined;
    try {
      await updateRelatedTopics(projectId, topicId, value.map((guid) => ({ related_topic_guid: guid })));
    } catch (e) {
      return STRINGS.editor.relatedSaveFailed((e as Error).message);
    }
  };

  return { allowed, value, set: setEdited, ready: original !== undefined, error: stored.error, save };
}

export type RelatedDraft = ReturnType<typeof useRelatedDraft>;

// Form state of the topic editor; topic is undefined when adding one. onSaved gets an error when a
// follow-up request failed after the topic itself was saved
export function useTopicDraft(
  projectId: string,
  topic: Topic | undefined,
  extensions: Extensions | undefined,
  onSaved: (id: string, error?: string) => void,
) {
  const [fields, setFields] = useState(() => toFields(topic, extensions));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const related = useRelatedDraft(projectId, topic, extensions);

  const setField = <K extends keyof TopicFields>(key: K, value: TopicFields[K]) => setFields((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!fields.title.trim()) return setError(STRINGS.editor.titleRequired);
    setSaving(true);
    setError(undefined);
    try {
      const saved = topic
        ? await updateTopic(projectId, topic.guid, toPut(fields, topic))
        : await createTopic(projectId, toPost(fields));
      const id = saved?.guid ?? topic!.guid;
      const relatedError = await related.save(id);
      setSaving(false);
      onSaved(id, relatedError);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return { fields, setField, related, saving, error, save };
}
