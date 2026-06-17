import axios from 'axios';
import type { UploadResponse, PivotRequest, PivotResult } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export async function uploadCsv(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function computePivot(req: PivotRequest): Promise<PivotResult> {
  const res = await api.post<PivotResult>('/pivot', req);
  return res.data;
}
