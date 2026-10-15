import { cx, slugify } from "../../lib/format";
import styles from "./Badge.module.css";

export type BadgeKind = "status" | "prio" | "stage" | "type" | "label" | "due";

// Pill colored by its kind and value when Badge.module.css defines a "<kind>" or "<kind>-<value>" class
export function Badge({ kind, value }: { kind: BadgeKind; value?: string }) {
  if (!value) return null;
  return <span class={cx(styles.badge, styles[kind], styles[`${kind}-${slugify(value)}`])}>{value}</span>;
}
