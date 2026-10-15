import type { Comment } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { cx, formatDate } from "../../lib/format";
import styles from "./CommentList.module.css";

type Props = { comments: Comment[]; selectedId?: string; onSelect: (commentId?: string) => void };

// Comments with a viewpoint can be selected to show its snapshot; selecting again clears it
export function CommentList({ comments, selectedId, onSelect }: Props) {
  return (
    <ul>
      {comments.map((c) => {
        const body = (
          <>
            <div>
              <strong>{c.author ?? STRINGS.common.unknownAuthor}</strong> <span class={styles.date}>{formatDate(c.date)}</span>
              {c.viewpoint_guid && <span class={styles.viewpoint}>{STRINGS.topic.hasViewpoint}</span>}
            </div>
            <p class={styles.text}>{c.comment}</p>
          </>
        );
        const selected = c.guid === selectedId;
        return (
          <li class={styles.comment}>
            {c.viewpoint_guid ? (
              <button
                class={cx(styles.selectable, selected && styles.selected)}
                aria-pressed={selected}
                title={STRINGS.topic.showViewpoint}
                onClick={() => onSelect(selected ? undefined : c.guid)}
              >
                {body}
              </button>
            ) : (
              <div class={styles.plain}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
