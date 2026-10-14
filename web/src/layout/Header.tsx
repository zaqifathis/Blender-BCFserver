import type { ComponentChildren } from "preact";
import styles from "./Header.module.css";

export function Header({ children }: { children: ComponentChildren }) {
  return <header class={styles.header}>{children}</header>;
}
