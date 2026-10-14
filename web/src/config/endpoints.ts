// WebSocket message types handled by the Blender extension
export const ENDPOINTS = {
  projects: "projects.list",
  topics: "topics.list",
  extensions: "extensions.get",
  comments: "comments.list",
  viewpoints: "viewpoints.list",
  documentReferences: "document_references.list",
  documents: "documents.list",
} as const;

// HTTP route serving viewpoint snapshots: /<project>/<topic>/<viewpoint>
export const SNAPSHOT_PATH = "/api/snapshot";

// HTTP route downloading project documents: /<project>/<document>?name=<filename>
export const DOCUMENT_PATH = "/api/document";
