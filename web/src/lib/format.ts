export function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export const slugify = (s: string) => s.toLowerCase().replace(/\W+/g, "-");

// Join class names, skipping falsy ones
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");
