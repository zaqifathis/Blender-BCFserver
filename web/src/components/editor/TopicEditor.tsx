import type { Extensions, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { useTopicDraft } from "../../hooks/useTopicDraft";
import { Button } from "../common/Button";
import { ErrorMessage } from "../common/StatusMessage";
import styles from "./TopicEditor.module.css";
import { TopicFieldsForm } from "./TopicFieldsForm";

type Props = {
  projectId: string;
  // Absent when adding a topic
  topic?: Topic;
  extensions?: Extensions;
  labelOptions: string[];
  onSaved: (topicId: string) => void;
  onCancel: () => void;
};

// Mount once per topic; nothing reaches the server until Save
export function TopicEditor({ projectId, topic, extensions, labelOptions, onSaved, onCancel }: Props) {
  const draft = useTopicDraft(projectId, topic, extensions, onSaved);
  const { editor } = STRINGS;

  return (
    <form
      class={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        draft.save();
      }}
    >
      <fieldset class={styles.body} disabled={draft.saving}>
        <h2 class={styles.title}>{topic ? editor.editTopic : editor.newTopic}</h2>
        <TopicFieldsForm fields={draft.fields} onChange={draft.setField} extensions={extensions} labelOptions={labelOptions} />
      </fieldset>
      <footer class={styles.footer}>
        <ErrorMessage error={draft.error} />
        <div class={styles.buttons}>
          <Button onClick={onCancel} disabled={draft.saving}>
            {editor.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={draft.saving || !draft.fields.title.trim()}>
            {draft.saving ? editor.saving : editor.save}
          </Button>
        </div>
      </footer>
    </form>
  );
}
