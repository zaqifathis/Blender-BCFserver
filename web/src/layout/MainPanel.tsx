import type { ComponentChildren } from "preact";
import styles from "./MainPanel.module.css";

export function MainPanel({ children }: { children: ComponentChildren }) {
  return <main class={styles.main}>{children}</main>;
}
