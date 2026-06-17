import axios from 'axios';
import type { Annotation, CodeSubmission, DiffResult } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const uploadCode = async (code: string, filename?: string): Promise<CodeSubmission> => {
  const response = await api.post('/upload', { code, filename });
  return response.data;
};

export const getCode = async (id: string): Promise<CodeSubmission> => {
  const response = await api.get(`/code/${id}`);
  return response.data;
};

export const getAnnotations = async (submissionId: string): Promise<Annotation[]> => {
  const response = await api.get('/annotations', { params: { submissionId } });
  return response.data;
};

export const createAnnotation = async (annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<Annotation> => {
  const response = await api.post('/annotations', annotation);
  return response.data;
};

export const deleteAnnotation = async (id: string): Promise<void> => {
  await api.delete(`/annotations/${id}`);
};

export const computeDiff = async (originalImage: string, modifiedImage: string): Promise<DiffResult> => {
  const response = await api.post('/diff', { originalImage, modifiedImage });
  return response.data;
};

export default api;
