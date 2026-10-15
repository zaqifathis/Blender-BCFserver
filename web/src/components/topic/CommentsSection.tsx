import type { Comment } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import { ErrorMessage } from "../common/StatusMessage";
import { CommentList } from "./CommentList";
import styles from "./CommentsSection.module.css";

type Props = {
  comments: AsyncState<Comment[]>;
  newestFirst: boolean;
  onToggleOrder: () => void;
  selectedId?: string;
  onSelect: (commentId?: string) => void;
};

export function CommentsSection({ comments, newestFirst, onToggleOrder, selectedId, onSelect }: Props) {
  const { topic } = STRINGS;
  return (
    <section>
      <h3 class={styles.heading}>
        {topic.comments}
        {comments.data ? topic.commentsCount(comments.data.length) : ""}
        <button class={styles.orderToggle} onClick={onToggleOrder} title={topic.changeOrder}>
          {newestFirst ? topic.newestFirst : topic.oldestFirst}
        </button>
      </h3>
      <ErrorMessage error={comments.error} />
      <CommentList comments={comments.data ?? []} selectedId={selectedId} onSelect={onSelect} />
    </section>
  );
}
