import { useState } from "preact/hooks";
import { captureViewpointFromBlender, createComment, deleteComment, deleteViewpoint, updateComment } from "../api/bcf";
import type { Comment, CommentPost } from "../api/types";
import { STRINGS } from "../config/strings";

export type CommentEditing = ReturnType<typeof useCommentEditing>;

// Picked in the form for the comment's viewpoint: one of the topic's (its guid), a new one from Blender, or none
export const NEW_VIEWPOINT = "new";
export type ViewpointChoice = string | null;

// Add / edit / delete flow around the selected comment. Mount once per topic; reload refetches the comments,
// reloadViewpoints the topic's viewpoints after a new one was captured for a comment.
export function useCommentEditing(
  projectId: string,
  topicId: string,
  selected: Comment | undefined,
  select: (commentId?: string) => void,
  reload: () => void,
  reloadViewpoints: () => void,
) {
  // The comment being edited, fixed when the form opens; null while adding one, undefined when the form is closed
  const [target, setTarget] = useState<Comment | null>();
  const [text, setText] = useState("");
  const [viewpoint, setViewpoint] = useState<ViewpointChoice>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const open = (next: Comment | null | undefined, initial = "") => {
    setTarget(next);
    setText(initial);
    setViewpoint(next?.viewpoint_guid ?? null);
    setError(undefined);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // A comment needs text, a viewpoint or both (comment_POST.json). PUT replaces the comment (comment_PUT.json).
  // A new viewpoint belongs to the topic and is posted first, so the comment can refer to its guid.
  const save = () =>
    run(async () => {
      const comment = text.trim();
      if ((!comment && !viewpoint) || target === undefined) return;
      const isNew = viewpoint === NEW_VIEWPOINT;
      const viewpointId = isNew ? (await captureViewpointFromBlender(projectId, topicId)).viewpoint.guid : viewpoint;
      let created: Comment | undefined;
      try {
        if (target) {
          await updateComment(projectId, topicId, target.guid, { ...(comment && { comment }), viewpoint_guid: viewpointId });
        } else {
          const body: CommentPost = { ...(comment && { comment }), ...(viewpointId && { viewpoint_guid: viewpointId }) };
          created = await createComment(projectId, topicId, body);
        }
      } catch (e) {
        // Do not leave a viewpoint behind that nothing refers to
        if (isNew && viewpointId) await deleteViewpoint(projectId, topicId, viewpointId).catch(() => undefined);
        throw e;
      }
      if (created?.guid) select(created.guid);
      if (isNew) reloadViewpoints();
      open(undefined);
      reload();
    });

  const remove = () => {
    if (!selected || !confirm(STRINGS.actions.confirmDeleteComment)) return;
    open(undefined);
    run(async () => {
      await deleteComment(projectId, topicId, selected.guid);
      select(undefined);
      reload();
    });
  };

  return {
    open: target !== undefined,
    editing: Boolean(target),
    text,
    setText,
    viewpoint,
    setViewpoint,
    canSave: Boolean(text.trim() || viewpoint),
    busy,
    error,
    add: () => open(null),
    edit: () => selected && open(selected, selected.comment ?? ""),
    cancel: () => open(undefined),
    save,
    remove,
  };
}
