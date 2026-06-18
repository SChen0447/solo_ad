import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface User {
  id: string
  name: string
  avatar: string
}

export interface Annotation {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  lineIndex: number
  createdAt: string
}

export interface TextAttachment {
  id: string
  type: 'text'
  title: string
  content: string
  annotations: Annotation[]
  createdAt: string
}

export interface ImageAttachment {
  id: string
  type: 'image'
  filename: string
  url: string
  thumbnail: string
  width: number
  height: number
  createdAt: string
}

export type Attachment = TextAttachment | ImageAttachment

export interface TimelineEvent {
  id: string
  type: 'create' | 'update' | 'comment' | 'upload'
  userId: string
  userName: string
  userAvatar: string
  description: string
  createdAt: string
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  createdAt: string
}

export interface ExperimentSummary {
  id: string
  title: string
  summary: string
  status: '进行中' | '已完成' | '失败'
  creator: User
  createdAt: string
  updatedAt: string
}

export interface Experiment extends ExperimentSummary {
  description: string
  attachments: Attachment[]
  comments: Comment[]
  timeline: TimelineEvent[]
}

export const experimentApi = {
  getExperiments: () => api.get<ExperimentSummary[]>('/experiments'),
  getExperiment: (id: string) => api.get<Experiment>(`/experiments/${id}`),
  createExperiment: (data: { title: string; summary: string; description: string }) =>
    api.post<Experiment>('/experiments', data),
  updateExperiment: (id: string, data: Partial<Experiment>) =>
    api.put<Experiment>(`/experiments/${id}`, data),
  deleteExperiment: (id: string) => api.delete(`/experiments/${id}`),
  addComment: (id: string, content: string) =>
    api.post<Comment>(`/experiments/${id}/comments`, { content }),
  addTextAttachment: (experimentId: string, title: string, content: string) =>
    api.post<TextAttachment>(`/attachments/text/${experimentId}`, { title, content }),
  addImageAttachment: (experimentId: string, data: {
    filename: string
    url: string
    thumbnail: string
    width: number
    height: number
  }) => api.post<ImageAttachment>(`/attachments/image/${experimentId}`, data),
  addAnnotation: (attachmentId: string, content: string, lineIndex: number) =>
    api.post<Annotation>(`/attachments/${attachmentId}/annotations`, { content, lineIndex }),
  deleteAttachment: (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
}

export default api
