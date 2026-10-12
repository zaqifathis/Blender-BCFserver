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
  assigned_to?: string;
  labels?: string[];
  creation_author?: string;
  creation_date?: string;
  due_date?: string;
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
