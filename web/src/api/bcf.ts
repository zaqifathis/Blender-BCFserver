import { DOCUMENT_PATH, ENDPOINTS, SNAPSHOT_PATH } from "../config/endpoints";
import type {
  Comment,
  CommentInput,
  Document,
  DocumentReference,
  Extensions,
  Project,
  Snapshot,
  Topic,
  TopicFile,
  TopicPost,
  TopicPut,
  Viewpoint,
} from "./types";
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

export const createTopic = (projectId: string, topic: TopicPost) =>
  request<Topic>(ENDPOINTS.createTopic, { project_id: projectId, topic });

export const updateTopic = (projectId: string, topicId: string, topic: TopicPut) =>
  request<Topic>(ENDPOINTS.updateTopic, { project_id: projectId, topic_id: topicId, topic });

export const deleteTopic = (projectId: string, topicId: string) =>
  request<null>(ENDPOINTS.deleteTopic, { project_id: projectId, topic_id: topicId });

export const createComment = (projectId: string, topicId: string, comment: CommentInput) =>
  request<Comment>(ENDPOINTS.createComment, { project_id: projectId, topic_id: topicId, comment });

export const updateComment = (projectId: string, topicId: string, commentId: string, comment: CommentInput) =>
  request<Comment>(ENDPOINTS.updateComment, { project_id: projectId, topic_id: topicId, comment_id: commentId, comment });

// A viewpoint holding only a snapshot image, e.g. an uploaded screenshot
export const createSnapshotViewpoint = (projectId: string, topicId: string, snapshot: Snapshot) =>
  request<Viewpoint>(ENDPOINTS.createViewpoint, { project_id: projectId, topic_id: topicId, viewpoint: { snapshot } });

export const deleteViewpoint = (projectId: string, topicId: string, viewpointId: string) =>
  request<null>(ENDPOINTS.deleteViewpoint, { project_id: projectId, topic_id: topicId, viewpoint_id: viewpointId });
