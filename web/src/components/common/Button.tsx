import type { ComponentChildren } from "preact";
import { cx } from "../../lib/format";
import styles from "./Button.module.css";

type Props = {
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
  children: ComponentChildren;
};

export function Button({ onClick, type = "button", variant = "default", disabled, title, children }: Props) {
  return (
    <button type={type} class={cx(styles.button, styles[variant])} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}
