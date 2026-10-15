import { useState } from "preact/hooks";
import { createComment, deleteComment, updateComment } from "../api/bcf";
import type { Comment } from "../api/types";
import { STRINGS } from "../config/strings";

export type CommentEditing = ReturnType<typeof useCommentEditing>;

// Add / edit / delete flow around the selected comment. Mount once per topic; reload refetches the comments.
export function useCommentEditing(
  projectId: string,
  topicId: string,
  selected: Comment | undefined,
  select: (commentId?: string) => void,
  reload: () => void,
) {
  // The comment being edited, fixed when the form opens; null while adding one, undefined when the form is closed
  const [target, setTarget] = useState<Comment | null>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const open = (next: Comment | null | undefined, initial = "") => {
    setTarget(next);
    setText(initial);
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

  // POST sends only the text (comment_POST.json); PUT replaces the comment, so it keeps its viewpoint (comment_PUT.json)
  const save = () =>
    run(async () => {
      const comment = text.trim();
      if (!comment || target === undefined) return;
      if (target) {
        await updateComment(projectId, topicId, target.guid, { comment, viewpoint_guid: target.viewpoint_guid ?? null });
      } else {
        const created = await createComment(projectId, topicId, { comment });
        if (created?.guid) select(created.guid);
      }
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
    busy,
    error,
    add: () => open(null),
    edit: () => selected && open(selected, selected.comment ?? ""),
    cancel: () => open(undefined),
    save,
    remove,
  };
}
