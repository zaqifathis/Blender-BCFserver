import type { ComponentChildren } from "preact";
import { STRINGS } from "../../config/strings";
import { cx } from "../../lib/format";
import styles from "./Field.module.css";

type Props = { label: string; required?: boolean; wide?: boolean; group?: boolean; children: ComponentChildren };

// Caption above its control. group renders a div, for controls made of several buttons that a <label> would misfire.
export function Field({ label, required, wide, group, children }: Props) {
  const Tag = group ? "div" : "label";
  return (
    <Tag class={cx(styles.field, wide && styles.wide)}>
      <span class={styles.label}>
        {label}
        {required && STRINGS.editor.required}
      </span>
      {children}
    </Tag>
  );
}
