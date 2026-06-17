import axios from 'axios';
import type { UploadResponse, ExtractResponse, SaveResponse, Component, BoundingBox } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const uploadDesign = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export const extractComponent = async (
  imageBase64: string,
  bbox: BoundingBox
): Promise<ExtractResponse> => {
  const response = await apiClient.post<ExtractResponse>('/extract', {
    imageBase64,
    bbox: [bbox.x, bbox.y, bbox.width, bbox.height]
  });

  return response.data;
};

export const saveAnnotations = async (components: Component[]): Promise<SaveResponse> => {
  const response = await apiClient.post<SaveResponse>('/save', {
    components,
    createdAt: new Date().toISOString()
  });

  return response.data;
};

export const apiService = {
  uploadDesign,
  extractComponent,
  saveAnnotations
};
