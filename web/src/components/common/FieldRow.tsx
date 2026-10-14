import type { ComponentChildren } from "preact";
import styles from "./FieldRow.module.css";

type Props = { label: string; children: ComponentChildren; action?: ComponentChildren };

// Label, control and an optional trailing action button in fixed columns
export function FieldRow({ label, children, action }: Props) {
  return (
    <div class={styles.row}>
      <span class={styles.label}>{label}</span>
      {children}
      {action}
    </div>
  );
}

export const fieldActionClass = styles.action;
