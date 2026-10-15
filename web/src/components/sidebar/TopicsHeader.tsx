import { STRINGS } from "../../config/strings";
import { ActionButtons } from "../common/ActionButtons";
import styles from "./TopicsHeader.module.css";

type Props = { canEdit: boolean; onAdd: () => void };

// Add is disabled unless the project allows creating and updating topics
export function TopicsHeader({ canEdit, onAdd }: Props) {
  const { actions } = STRINGS;
  return (
    <div class={styles.header}>
      <h2 class={styles.title}>{STRINGS.sidebar.topics}</h2>
      <ActionButtons
        add={{ label: actions.addTopic, title: canEdit ? actions.addTopic : actions.notAllowed, disabled: !canEdit, onClick: onAdd }}
      />
    </div>
  );
}
