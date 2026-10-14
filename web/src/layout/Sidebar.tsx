import type { ComponentChildren } from "preact";
import styles from "./Sidebar.module.css";

export function Sidebar({ children }: { children: ComponentChildren }) {
  return <aside class={styles.sidebar}>{children}</aside>;
}
