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
}

export interface Extensions {
  topic_type?: string[];
  topic_status?: string[];
  topic_label?: string[];
  priority?: string[];
  users?: string[];
  stage?: string[];
}

export interface Comment {
  guid: string;
  comment?: string;
  author?: string;
  date?: string;
  viewpoint_guid?: string;
}

export interface Viewpoint {
  guid: string;
}

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
