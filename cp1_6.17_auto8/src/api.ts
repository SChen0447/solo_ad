import axios from 'axios';
import type { DocumentData, RiskClause, Chapter, ComplianceScore } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const uploadDocument = async (file: File): Promise<{ documentId: string; content: string; title: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const analyzeDocument = async (content: string, title: string): Promise<{ risks: RiskClause[]; chapters: Chapter[] }> => {
  const { data } = await api.post('/analyze', { content, title });
  return data;
};

export const calculateScore = async (content: string, risks: RiskClause[]): Promise<ComplianceScore> => {
  const { data } = await api.post('/score', { content, risks });
  return data;
};

export const exportReport = async (original: string, modified: string, risks: RiskClause[]): Promise<Blob> => {
  const { data } = await api.post('/export', { original, modified, risks }, {
    responseType: 'blob'
  });
  return data;
};
