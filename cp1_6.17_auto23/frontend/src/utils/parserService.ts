import axios from 'axios';
import type { ResumeData } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const parseResume = async (text: string): Promise<ResumeData> => {
  try {
    const response = await api.post<ResumeData>('/parse', { text });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || '解析请求失败';
      throw new Error(message);
    }
    throw new Error('网络错误，请稍后重试');
  }
};

export const exportResumeConfig = async (data: {
  resumeData: ResumeData;
  theme: object;
  moduleOrder: object[];
}): Promise<object> => {
  try {
    const response = await api.post('/export', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || '导出请求失败';
      throw new Error(message);
    }
    throw new Error('网络错误，请稍后重试');
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
};
