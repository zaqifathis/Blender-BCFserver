import type { Extensions } from "../api/types";

// Topic filters from the BCF API "GET Topics" OData filter parameters; key is the OData property.
// "value" compares with eq, "list" matches any element of a string array, "date" is a day range.
export type FilterKind = "value" | "list" | "date";
export type FilterDef = { key: string; label: string; kind: FilterKind; source?: keyof Extensions };

// A key is present once its filter was added from the menu; empty fields mean no constraint
export type FilterValue = { value?: string; from?: string; to?: string };
export type Filters = Record<string, FilterValue>;

export const DATE_RANGE_ENDS = ["from", "to"] as const;
export type DateRangeEnd = (typeof DATE_RANGE_ENDS)[number];

export const FILTERS: FilterDef[] = [
  { key: "creation_author", label: "Created by", kind: "value", source: "users" },
  { key: "modified_author", label: "Modified by", kind: "value", source: "users" },
  { key: "assigned_to", label: "Assigned to", kind: "value", source: "users" },
  { key: "stage", label: "Stage", kind: "value", source: "stage" },
  { key: "topic_status", label: "Status", kind: "value", source: "topic_status" },
  { key: "topic_type", label: "Type", kind: "value", source: "topic_type" },
  { key: "priority", label: "Priority", kind: "value", source: "priority" },
  { key: "labels", label: "Label", kind: "list", source: "topic_label" },
  { key: "creation_date", label: "Created", kind: "date" },
  { key: "modified_date", label: "Modified", kind: "date" },
];

// Filter that, when set, also shows closed topics
export const STATUS_FILTER_KEY = "topic_status";
