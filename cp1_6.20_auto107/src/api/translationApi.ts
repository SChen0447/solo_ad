import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { UploadResponse, TranslationResponse, TranslateResponse, Comment } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const uploadDoc = async (file: File, format: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  
  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const translateDoc = async (docId: string): Promise<TranslateResponse> => {
  const response = await api.post<TranslateResponse>('/translate', { doc_id: docId });
  return response.data;
};

export const fetchTranslations = async (
  docId: string,
  page: number = 0,
  pageSize: number = 100
): Promise<TranslationResponse> => {
  const response = await api.get<TranslationResponse>(
    `/documents/${docId}/translations?page=${page}&page_size=${pageSize}`
  );
  return response.data;
};

export const updateTranslation = async (
  docId: string,
  paragraphIndex: number,
  translation: string
): Promise<{ success: boolean; doc_id: string; paragraph_index: number }> => {
  const response = await api.post('/update-translation', {
    doc_id: docId,
    paragraph_index: paragraphIndex,
    translation,
  });
  return response.data;
};

export const fetchComments = async (
  docId: string,
  paragraphIndex?: number
): Promise<{ doc_id: string; paragraph_index?: number; comments: Comment[] }> => {
  const url = paragraphIndex !== undefined
    ? `/documents/${docId}/comments?paragraph_index=${paragraphIndex}`
    : `/documents/${docId}/comments`;
  const response = await api.get(url);
  return response.data;
};

export const submitComment = async (
  docId: string,
  paragraphIndex: number,
  content: string,
  userName: string,
  userId: string
): Promise<Comment> => {
  const response = await api.post<Comment>(`/documents/${docId}/comments`, {
    paragraph_index: paragraphIndex,
    content,
    user_name: userName,
    user_id: userId,
  });
  return response.data;
};

export const updateReviewStatus = async (
  docId: string,
  paragraphIndex: number,
  status: 'pending' | 'reviewed' | 'disputed'
): Promise<{ success: boolean; paragraph_index: number; status: string }> => {
  const response = await api.post(`/documents/${docId}/review-status`, {
    paragraph_index: paragraphIndex,
    status,
  });
  return response.data;
};

export const exportDocument = async (docId: string, format: 'md' | 'pdf'): Promise<void> => {
  const response = await api.get(`/documents/${docId}/export?format=${format}`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `document_${docId}.${format === 'md' ? 'md' : 'txt'}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
