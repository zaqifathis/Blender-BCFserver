import { STRINGS } from "../../config/strings";
import styles from "./AppTitle.module.css";

export function AppTitle() {
  return <h1 class={styles.title}>{STRINGS.header.title}</h1>;
}
