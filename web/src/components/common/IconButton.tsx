import type { ComponentChildren } from "preact";
import { cx } from "../../lib/format";
import controls from "./controls.module.css";
import styles from "./IconButton.module.css";

type Props = {
  label: string;
  title?: string;
  onClick: () => void;
  highlighted?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  class?: string;
  children: ComponentChildren;
};

export function IconButton({ label, title = label, onClick, highlighted, disabled, expanded, class: className, children }: Props) {
  return (
    <button
      class={cx(styles.iconButton, highlighted && controls.highlighted, className)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-expanded={expanded}
    >
      {children}
    </button>
  );
}
