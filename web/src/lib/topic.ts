import type { Topic } from "../api/types";
import { CLOSED_STATUSES } from "../config/topicStatus";

export const isClosed = (t: Topic) => CLOSED_STATUSES.has((t.topic_status ?? "").toLowerCase());

// A date-only due date ("YYYY-MM-DD") runs until the end of that local day
function dueAt(due: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return new Date(due);
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d + 1);
}

export const isOverdue = (t: Topic, now = new Date()) => Boolean(t.due_date) && !isClosed(t) && dueAt(t.due_date!) < now;
