import { AddIcon, DeleteIcon, EditIcon } from "./icons/ActionIcons";
import { IconButton } from "./IconButton";
import styles from "./ActionButtons.module.css";

export type Action = { label: string; title?: string; disabled?: boolean; onClick: () => void };

type Props = { add?: Action; edit?: Action; remove?: Action };

// Add (+), edit (pen) and delete (−) icon buttons; each shows only when given
export function ActionButtons({ add, edit, remove }: Props) {
  return (
    <div class={styles.actions}>
      {add && (
        <IconButton {...add}>
          <AddIcon />
        </IconButton>
      )}
      {edit && (
        <IconButton {...edit}>
          <EditIcon />
        </IconButton>
      )}
      {remove && (
        <IconButton variant="danger" {...remove}>
          <DeleteIcon />
        </IconButton>
      )}
    </div>
  );
}
