// WebSocket message types handled by the Blender extension
export const ENDPOINTS = {
  projects: "projects.list",
  topics: "topics.list",
  extensions: "extensions.get",
  comments: "comments.list",
  viewpoints: "viewpoints.list",
} as const;

// HTTP route serving viewpoint snapshots: /<project>/<topic>/<viewpoint>
export const SNAPSHOT_PATH = "/api/snapshot";
