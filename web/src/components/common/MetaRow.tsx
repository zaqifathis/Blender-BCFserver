import type { ComponentChildren } from "preact";
import styles from "./MetaRow.module.css";

export function MetaRow({ children }: { children: ComponentChildren }) {
  return <span class={styles.meta}>{children}</span>;
}

export function MetaText({ children }: { children: ComponentChildren }) {
  return <span class={styles.muted}>{children}</span>;
}
