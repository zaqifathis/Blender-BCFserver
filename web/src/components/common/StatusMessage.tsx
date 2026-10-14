import type { ComponentChildren } from "preact";
import styles from "./StatusMessage.module.css";

type Props = { variant?: "muted" | "error"; children: ComponentChildren };

export function StatusMessage({ variant = "muted", children }: Props) {
  return <p class={styles[variant]}>{children}</p>;
}

// Renders an error message only when there is one
export function ErrorMessage({ error }: { error?: string }) {
  return error ? <StatusMessage variant="error">{error}</StatusMessage> : null;
}
