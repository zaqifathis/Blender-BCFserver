export type Sort = { field: string; desc: boolean };

// "GET Topics" OData sort parameters (deprecated index left out)
export const TOPIC_SORTS: { key: string; label: string }[] = [
  { key: "creation_date", label: "Created" },
  { key: "modified_date", label: "Modified" },
  { key: "server_assigned_id", label: "ID" },
];

export const DEFAULT_TOPIC_SORT: Sort = { field: "creation_date", desc: true };

export const COMMENT_SORT_FIELD = "date";
