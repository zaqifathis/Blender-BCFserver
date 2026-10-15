import { useState } from "preact/hooks";
import { deleteTopic } from "../api/bcf";
import type { Topic } from "../api/types";
import { STRINGS } from "../config/strings";
import { useResettableState } from "./useResettableState";

export type EditorMode = "create" | "edit";
export type TopicEditing = ReturnType<typeof useTopicEditing>;

// Add / edit / delete flow around the selected topic. reload refetches the topic list.
export function useTopicEditing(projectId: string, topic: Topic | undefined, setTopicId: (id: string) => void, reload: () => void) {
  const [mode, setMode] = useResettableState<EditorMode | undefined>(projectId, undefined);
  const [error, setError] = useResettableState<string | undefined>(projectId, undefined);
  // Bumped on save so the topic detail refetches its comments and viewpoints
  const [revision, setRevision] = useState(0);

  const open = (next?: EditorMode) => {
    setError(undefined);
    setMode(next);
  };
  // Picking another topic leaves the editor without saving
  const select = (id: string) => {
    open(undefined);
    setTopicId(id);
  };
  const saved = (id: string) => {
    open(undefined);
    setTopicId(id);
    setRevision((r) => r + 1);
    reload();
  };
  const remove = async () => {
    if (!topic || !confirm(STRINGS.actions.confirmDelete(topic.title))) return;
    open(undefined);
    try {
      await deleteTopic(projectId, topic.guid);
      setTopicId("");
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return {
    mode,
    error,
    revision,
    select,
    add: () => open("create"),
    edit: () => topic && open("edit"),
    cancel: () => open(undefined),
    saved,
    remove,
  };
}
