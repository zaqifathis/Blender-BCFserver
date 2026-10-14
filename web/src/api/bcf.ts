import { DOCUMENT_PATH, ENDPOINTS, SNAPSHOT_PATH } from "../config/endpoints";
import type { Comment, Document, DocumentReference, Extensions, Project, Topic, TopicFile, Viewpoint } from "./types";
import { request } from "./ws";

export const listProjects = () => request<Project[]>(ENDPOINTS.projects);

export const listTopics = (projectId: string, filter: string, orderby: string) =>
  request<Topic[]>(ENDPOINTS.topics, { project_id: projectId, filter, orderby });

export const getExtensions = (projectId: string) => request<Extensions>(ENDPOINTS.extensions, { project_id: projectId });

export const listComments = (projectId: string, topicId: string, orderby: string) =>
  request<Comment[]>(ENDPOINTS.comments, { project_id: projectId, topic_id: topicId, orderby });

export const listViewpoints = (projectId: string, topicId: string) =>
  request<Viewpoint[]>(ENDPOINTS.viewpoints, { project_id: projectId, topic_id: topicId });

export const snapshotUrl = (projectId: string, topicId: string, viewpointId: string) =>
  `${SNAPSHOT_PATH}/${[projectId, topicId, viewpointId].map(encodeURIComponent).join("/")}`;

export const listDocumentReferences = (projectId: string, topicId: string) =>
  request<DocumentReference[]>(ENDPOINTS.documentReferences, { project_id: projectId, topic_id: topicId });

export const listDocuments = (projectId: string) => request<Document[]>(ENDPOINTS.documents, { project_id: projectId });

export const listFiles = (projectId: string, topicId: string) =>
  request<TopicFile[]>(ENDPOINTS.files, { project_id: projectId, topic_id: topicId });

export const documentUrl = (projectId: string, documentId: string, filename?: string) =>
  `${DOCUMENT_PATH}/${[projectId, documentId].map(encodeURIComponent).join("/")}` +
  (filename ? `?name=${encodeURIComponent(filename)}` : "");
