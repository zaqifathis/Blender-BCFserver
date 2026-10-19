import type { Comment, Extensions, Topic } from "../api/types";
import {
  COMMENT_CREATE_ACTION,
  COMMENT_DELETE_ACTION,
  COMMENT_UPDATE_ACTION,
  RELATED_TOPICS_UPDATE_ACTION,
  TOPIC_EDIT_ACTIONS,
} from "../config/permissions";
import { CLOSED_STATUSES } from "../config/topicStatus";

export const isClosed = (t: Topic) => CLOSED_STATUSES.has((t.topic_status ?? "").toLowerCase());

// A date-only due date ("YYYY-MM-DD") runs until the end of that local day
function dueAt(due: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return new Date(due);
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d + 1);
}

export const isOverdue = (t: Topic, now = new Date()) => Boolean(t.due_date) && !isClosed(t) && dueAt(t.due_date!) < now;

// Labels from the project extensions plus those seen on topics, as servers often leave topic_label empty
export const knownLabels = (defined: string[] = [], seen: string[] = []) => [
  ...defined,
  ...seen.filter((l) => !defined.includes(l)),
];

// Picker and link text; the server's short id, when it assigns one, tells apart topics with the same title
export const topicLabel = (t: Topic) => (t.server_assigned_id ? `${t.server_assigned_id} · ${t.title}` : t.title);

export const canEditTopics = (extensions?: Extensions) =>
  TOPIC_EDIT_ACTIONS.every((a) => extensions?.project_actions?.includes(a));

// A topic's or comment's own authorization, when the server sends one, replaces the project defaults.
// A topic not created yet has none, so it gets the project defaults.
const topicActions = (topic: Topic | undefined, extensions?: Extensions) =>
  topic?.authorization?.topic_actions ?? extensions?.topic_actions ?? [];

export const canAddComments = (topic: Topic, extensions?: Extensions) =>
  topicActions(topic, extensions).includes(COMMENT_CREATE_ACTION);

export const canUpdateRelatedTopics = (topic: Topic | undefined, extensions?: Extensions) =>
  topicActions(topic, extensions).includes(RELATED_TOPICS_UPDATE_ACTION);

const commentActions = (comment: Comment, extensions?: Extensions) =>
  comment.authorization?.comment_actions ?? extensions?.comment_actions ?? [];

export const canEditComment = (comment: Comment, extensions?: Extensions) =>
  commentActions(comment, extensions).includes(COMMENT_UPDATE_ACTION);

export const canDeleteComment = (comment: Comment, extensions?: Extensions) =>
  commentActions(comment, extensions).includes(COMMENT_DELETE_ACTION);
