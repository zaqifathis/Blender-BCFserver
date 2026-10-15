import { STRINGS } from "../../config/strings";
import { Button } from "../common/Button";
import styles from "./TopicActions.module.css";

type Props = { canEdit: boolean; hasSelection: boolean; onAdd: () => void; onEdit: () => void; onDelete: () => void };

// Disabled unless the project allows creating and updating topics; edit and delete act on the selected topic
export function TopicActions({ canEdit, hasSelection, onAdd, onEdit, onDelete }: Props) {
  const { actions } = STRINGS;
  const title = (allowed: string) => (canEdit ? allowed : actions.notAllowed);
  return (
    <div class={styles.actions}>
      <Button onClick={onAdd} disabled={!canEdit} title={title(actions.addTopic)}>
        {actions.add}
      </Button>
      <Button onClick={onEdit} disabled={!canEdit || !hasSelection} title={title(actions.editTopic)}>
        {actions.edit}
      </Button>
      <Button variant="danger" onClick={onDelete} disabled={!canEdit || !hasSelection} title={title(actions.deleteTopic)}>
        {actions.delete}
      </Button>
    </div>
  );
}
