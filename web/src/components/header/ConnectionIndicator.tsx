import { STRINGS } from "../../config/strings";
import { cx } from "../../lib/format";
import styles from "./ConnectionIndicator.module.css";

export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      class={cx(styles.dot, connected ? styles.on : styles.off)}
      title={connected ? STRINGS.header.connected : STRINGS.header.waiting}
    />
  );
}
