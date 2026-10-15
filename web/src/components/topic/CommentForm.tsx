import { STRINGS } from "../../config/strings";
import type { CommentEditing } from "../../hooks/useCommentEditing";
import { inputValue } from "../../lib/dom";
import { Button } from "../common/Button";
import styles from "./CommentForm.module.css";

// Text of a new or edited comment; nothing reaches the server until Save
export function CommentForm({ editing }: { editing: CommentEditing }) {
  const { editor } = STRINGS;
  return (
    <form
      class={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        editing.save();
      }}
    >
      <textarea
        rows={3}
        placeholder={STRINGS.topic.newComment}
        aria-label={STRINGS.topic.newComment}
        value={editing.text}
        onInput={(e) => editing.setText(inputValue(e))}
        disabled={editing.busy}
        autoFocus
      />
      <div class={styles.buttons}>
        <Button onClick={editing.cancel} disabled={editing.busy}>
          {editor.cancel}
        </Button>
        <Button type="submit" variant="primary" disabled={editing.busy || !editing.text.trim()}>
          {editing.busy ? editor.saving : editor.save}
        </Button>
      </div>
    </form>
  );
}
