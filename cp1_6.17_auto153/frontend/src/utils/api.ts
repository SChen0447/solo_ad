import axios from 'axios';

export interface DocumentVersion {
  id: string;
  version: number;
  content: string;
  timestamp: string;
  operationType: 'upload' | 'merge' | 'edit';
  filename?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
}

export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  totalDiffLines: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const uploadDocument = async (content: string, filename?: string): Promise<DocumentVersion> => {
  const response = await api.post('/documents', { content, filename });
  return response.data;
};

export const getDocumentVersions = async (): Promise<DocumentVersion[]> => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocumentById = async (id: string): Promise<DocumentVersion> => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const computeDiff = async (leftId: string, rightId: string): Promise<DiffResult> => {
  const response = await api.post('/diff', { leftId, rightId });
  return response.data;
};

export const saveMerge = async (content: string, leftId: string, rightId: string): Promise<DocumentVersion> => {
  const response = await api.post('/merge', { content, leftId, rightId });
  return response.data;
};

export const getTemplates = async (): Promise<Template[]> => {
  const response = await api.get('/templates');
  return response.data;
};

export const createTemplate = async (name: string, content: string): Promise<Template> => {
  const response = await api.post('/templates', { name, content });
  return response.data;
};

export const updateTemplate = async (id: string, name: string, content: string): Promise<Template> => {
  const response = await api.put(`/templates/${id}`, { name, content });
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/templates/${id}`);
};

export const generateFromTemplate = async (templateId: string, data: Record<string, string>): Promise<{ content: string }> => {
  const response = await api.post(`/templates/${templateId}/generate`, data);
  return response.data;
};

export default api;
