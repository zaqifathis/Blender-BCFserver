export function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export const slugify = (s: string) => s.toLowerCase().replace(/\W+/g, "-");

// Join class names, skipping falsy ones
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

const pad = (n: number) => String(n).padStart(2, "0");

// <input type="datetime-local"> value (local "YYYY-MM-DDTHH:MM") for an ISO-8601 datetime
export function toDateTimeInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// <input type="datetime-local"> value as an ISO-8601 UTC datetime, e.g. "2026-12-31T16:00:00Z"
export function fromDateTimeInput(value: string) {
  const d = new Date(value); // a datetime-local value parses as local time
  return isNaN(d.getTime()) ? "" : d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
