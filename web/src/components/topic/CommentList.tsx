import type { Comment } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { cx, formatDate } from "../../lib/format";
import styles from "./CommentList.module.css";

type Props = { comments: Comment[]; selectedId?: string; onSelect: (commentId?: string) => void };

// Selecting a comment picks it for edit / delete and shows its viewpoint's snapshot, if any; selecting again clears it
export function CommentList({ comments, selectedId, onSelect }: Props) {
  return (
    <ul>
      {comments.map((c) => {
        const selected = c.guid === selectedId;
        return (
          <li class={styles.comment}>
            <button
              class={cx(styles.selectable, selected && styles.selected)}
              aria-pressed={selected}
              title={c.viewpoint_guid ? STRINGS.topic.showViewpoint : STRINGS.topic.selectComment}
              onClick={() => onSelect(selected ? undefined : c.guid)}
            >
              <div>
                <strong>{c.author ?? STRINGS.common.unknownAuthor}</strong> <span class={styles.date}>{formatDate(c.date)}</span>
                {c.viewpoint_guid && <span class={styles.viewpoint}>{STRINGS.topic.hasViewpoint}</span>}
              </div>
              <p class={styles.text}>{c.comment}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
