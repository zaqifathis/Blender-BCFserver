export interface Project {
  project_id: string;
  name: string;
}

export interface Topic {
  guid: string;
  title: string;
  description?: string;
  topic_status?: string;
  topic_type?: string;
  priority?: string;
  stage?: string;
  assigned_to?: string;
  labels?: string[];
  creation_author?: string;
  creation_date?: string;
  modified_author?: string;
  modified_date?: string;
  due_date?: string;
  server_assigned_id?: string;
  // Not edited in the UI, but sent back on PUT so an update does not clear them
  reference_links?: string[];
  index?: number;
  bim_snippet?: object;
  // Only when the server includes authorization; overrides the project's topic_actions
  authorization?: { topic_actions?: string[] };
}

export interface Extensions {
  topic_type?: string[];
  topic_status?: string[];
  topic_label?: string[];
  priority?: string[];
  users?: string[];
  stage?: string[];
  project_actions?: string[];
  topic_actions?: string[];
  comment_actions?: string[];
  viewpoint_actions?: string[];
}

// Body of a topic POST (BCF 3.0 topic_POST.json): only title is required, unset fields are left out
export interface TopicPost {
  title: string;
  description?: string;
  labels?: string[];
  topic_type?: string;
  priority?: string;
  topic_status?: string;
  due_date?: string;
  assigned_to?: string;
  stage?: string;
}

// Body of a topic PUT (BCF 3.0 topic_PUT.json): replaces the topic, null clears a field
export interface TopicPut {
  title: string;
  description: string | null;
  labels: string[];
  topic_type: string | null;
  priority: string | null;
  topic_status: string | null;
  due_date: string | null;
  assigned_to: string | null;
  stage: string | null;
  reference_links?: string[] | null;
  index?: number | null;
  bim_snippet?: object;
}

// Body of a comment POST (BCF 3.0 comment_POST.json): text, viewpoint or both; an unset one is left out
export interface CommentPost {
  comment?: string;
  viewpoint_guid?: string;
}

// Body of a comment PUT (BCF 3.0 comment_PUT.json): replaces the comment, so its viewpoint is sent back too
export interface CommentPut {
  comment?: string;
  viewpoint_guid: string | null;
}

export type SnapshotType = "png" | "jpg";

// Base64 image without the data: prefix
export interface Snapshot {
  snapshot_type: SnapshotType;
  snapshot_data: string;
}

export interface Comment {
  guid: string;
  comment?: string;
  author?: string;
  date?: string;
  viewpoint_guid?: string;
  // Only when the server includes authorization; overrides the project's comment_actions
  authorization?: { comment_actions?: string[] };
}

// Body item of the related topics GET and PUT (BCF 3.0 related_topic_GET.json / related_topic_PUT.json)
export interface RelatedTopic {
  related_topic_guid: string;
}

// A bitmap image placed in a viewpoint's scene; the image itself is fetched separately
export interface Bitmap {
  guid: string;
  bitmap_type?: "png" | "jpg";
}

export interface Viewpoint {
  guid: string;
  bitmaps?: Bitmap[] | null;
  // Sort order; servers may leave it out
  index?: number | null;
  // Only when the server includes authorization; overrides the project's viewpoint_actions
  authorization?: { viewpoint_actions?: string[] };
}

// Viewpoint made from the Blender view and added to the topic, with what it could not hold
export interface CapturedViewpoint {
  viewpoint: Viewpoint;
  warnings: string[];
}

// Outcome of showing a viewpoint in Blender: applied, or the model must be loaded by hand first
export type ShowViewpointResult =
  | { status: "applied"; applied: string[]; missing: number; warnings: string[] }
  | { status: "needs_ifc"; external?: { filename?: string | null; url?: string | null } };

// Points either at a document stored on the server (document_guid) or at an external url
export interface DocumentReference {
  guid: string;
  document_guid?: string;
  url?: string;
  description?: string;
}

// Model file in the topic header; reference is an absolute uri or a server-specific id
export interface TopicFile {
  ifc_project?: string;
  filename?: string;
  reference?: string;
}

export interface Document {
  guid: string;
  filename: string;
  description?: string;
}
