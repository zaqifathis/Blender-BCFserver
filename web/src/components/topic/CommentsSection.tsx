import type { Ref } from "preact";
import type { Comment, Extensions, Topic, Viewpoint } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import type { CommentEditing } from "../../hooks/useCommentEditing";
import { canAddComments, canAddViewpoints, canDeleteComment, canEditComment } from "../../lib/topic";
import { ActionButtons } from "../common/ActionButtons";
import { ErrorMessage } from "../common/StatusMessage";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import styles from "./CommentsSection.module.css";

type Props = {
  projectId: string;
  topic: Topic;
  extensions?: Extensions;
  comments: AsyncState<Comment[]>;
  // The topic's viewpoints, to pick a comment's viewpoint from
  viewpoints: Viewpoint[];
  newestFirst: boolean;
  onToggleOrder: () => void;
  selectedId?: string;
  onSelect: (commentId?: string) => void;
  editing: CommentEditing;
  class?: string;
  // Clicks in here keep the selected comment
  containerRef?: Ref<HTMLElement>;
};

// Edit and delete act on the selected comment, each allowed by the comment's (or project's) comment_actions
export function CommentsSection({ projectId, topic, extensions, comments, viewpoints, newestFirst, onToggleOrder, selectedId, onSelect, editing, class: className, containerRef }: Props) {
  const { topic: strings, actions } = STRINGS;
  const selected = comments.data?.find((c) => c.guid === selectedId);
  const canAdd = canAddComments(topic, extensions);
  const canEdit = Boolean(selected) && canEditComment(selected!, extensions);
  const canDelete = Boolean(selected) && canDeleteComment(selected!, extensions);
  const title = (allowed: boolean, ok: string, denied: string) => (!selected ? actions.selectComment : allowed ? ok : denied);

  return (
    <section class={className} ref={containerRef}>
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
      {editing.open && (
        <CommentForm
          editing={editing}
          projectId={projectId}
          topicId={topic.guid}
          viewpoints={viewpoints}
          canCreateViewpoint={canAddViewpoints(topic, extensions)}
        />
      )}
      <ErrorMessage error={editing.error} />
      <ErrorMessage error={comments.error} />
      <CommentList comments={comments.data ?? []} selectedId={selectedId} onSelect={onSelect} />
    </section>
  );
}
