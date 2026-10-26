import type { Viewpoint } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { CommentEditing } from "../../hooks/useCommentEditing";
import { inputValue } from "../../lib/dom";
import { Button } from "../common/Button";
import styles from "./CommentForm.module.css";
import { ViewpointPicker } from "./ViewpointPicker";

type Props = {
  editing: CommentEditing;
  projectId: string;
  topicId: string;
  viewpoints: Viewpoint[];
  // Whether the topic allows adding a viewpoint, i.e. capturing a new one from Blender
  canCreateViewpoint: boolean;
};

// Text and viewpoint of a new or edited comment; nothing reaches the server until Save
export function CommentForm({ editing, projectId, topicId, viewpoints, canCreateViewpoint }: Props) {
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
      <ViewpointPicker
        projectId={projectId}
        topicId={topicId}
        viewpoints={viewpoints}
        value={editing.viewpoint}
        onChange={editing.setViewpoint}
        canCreate={canCreateViewpoint}
      />
      <div class={styles.buttons}>
        <Button onClick={editing.cancel} disabled={editing.busy}>
          {editor.cancel}
        </Button>
        <Button type="submit" variant="primary" disabled={editing.busy || !editing.canSave}>
          {editing.busy ? editor.saving : editor.save}
        </Button>
      </div>
    </form>
  );
}
