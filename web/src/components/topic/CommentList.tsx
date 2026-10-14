import type { Comment } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { formatDate } from "../../lib/format";
import styles from "./CommentList.module.css";

export function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <ul>
      {comments.map((c) => (
        <li class={styles.comment}>
          <div>
            <strong>{c.author ?? STRINGS.common.unknownAuthor}</strong> <span class={styles.date}>{formatDate(c.date)}</span>
          </div>
          <p class={styles.text}>{c.comment}</p>
        </li>
      ))}
    </ul>
  );
}
