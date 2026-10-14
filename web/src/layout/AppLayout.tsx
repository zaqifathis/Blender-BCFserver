import type { ComponentChildren } from "preact";
import styles from "./AppLayout.module.css";
import { Header } from "./Header";
import { MainPanel } from "./MainPanel";
import { Sidebar } from "./Sidebar";

type Props = { header: ComponentChildren; sidebar: ComponentChildren; main: ComponentChildren };

// Page shell: header across the top, sidebar and main panel below
export function AppLayout({ header, sidebar, main }: Props) {
  return (
    <div class={styles.app}>
      <Header>{header}</Header>
      <Sidebar>{sidebar}</Sidebar>
      <MainPanel>{main}</MainPanel>
    </div>
  );
}
