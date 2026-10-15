import type { Comment, Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import type { CommentEditing } from "../../hooks/useCommentEditing";
import { canAddComments, canDeleteComment, canEditComment } from "../../lib/topic";
import { ActionButtons } from "../common/ActionButtons";
import { ErrorMessage } from "../common/StatusMessage";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import styles from "./CommentsSection.module.css";

type Props = {
  topic: Topic;
  extensions?: Extensions;
  comments: AsyncState<Comment[]>;
  newestFirst: boolean;
  onToggleOrder: () => void;
  selectedId?: string;
  onSelect: (commentId?: string) => void;
  editing: CommentEditing;
  class?: string;
};

// Edit and delete act on the selected comment, each allowed by the comment's (or project's) comment_actions
export function CommentsSection({ topic, extensions, comments, newestFirst, onToggleOrder, selectedId, onSelect, editing, class: className }: Props) {
  const { topic: strings, actions } = STRINGS;
  const selected = comments.data?.find((c) => c.guid === selectedId);
  const canAdd = canAddComments(topic, extensions);
  const canEdit = Boolean(selected) && canEditComment(selected!, extensions);
  const canDelete = Boolean(selected) && canDeleteComment(selected!, extensions);
  const title = (allowed: boolean, ok: string, denied: string) => (!selected ? actions.selectComment : allowed ? ok : denied);

  return (
    <section class={className}>
      <div class={styles.header}>
        <h3 class={styles.heading}>
          {strings.comments}
          {comments.data ? strings.commentsCount(comments.data.length) : ""}
          <button class={styles.orderToggle} onClick={onToggleOrder} title={strings.changeOrder}>
            {newestFirst ? strings.newestFirst : strings.oldestFirst}
          </button>
        </h3>
        <ActionButtons
          add={{
            label: actions.addComment,
            title: canAdd ? actions.addComment : actions.addCommentNotAllowed,
            disabled: !canAdd || editing.busy,
            onClick: editing.add,
          }}
          edit={{
            label: actions.editComment,
            title: title(canEdit, actions.editComment, actions.editCommentNotAllowed),
            disabled: !canEdit || editing.busy,
            onClick: editing.edit,
          }}
          remove={{
            label: actions.deleteComment,
            title: title(canDelete, actions.deleteComment, actions.deleteCommentNotAllowed),
            disabled: !canDelete || editing.busy,
            onClick: editing.remove,
          }}
        />
      </div>
      {editing.open && <CommentForm editing={editing} />}
      <ErrorMessage error={editing.error} />
      <ErrorMessage error={comments.error} />
      <CommentList comments={comments.data ?? []} selectedId={selectedId} onSelect={onSelect} />
    </section>
  );
}
