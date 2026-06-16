import axios from 'axios';
import type { GenerateImageResponse, HealthResponse } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 9000,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.code === 'ECONNABORTED' &&
      !originalRequest._retry &&
      originalRequest.url?.includes('/generate')
    ) {
      originalRequest._retry = true;
      originalRequest.timeout = 9000;
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);

export const generateImage = async (
  prompt: string,
  onProgress?: (progress: number) => void
): Promise<GenerateImageResponse> => {
  const progressInterval = setInterval(() => {
    if (onProgress) {
      const currentProgress = Math.random() * 20 + 30;
      onProgress(Math.min(currentProgress, 90));
    }
  }, 800);

  try {
    const response = await apiClient.post<GenerateImageResponse>('/generate', { prompt });

    clearInterval(progressInterval);
    if (onProgress) {
      onProgress(100);
    }

    return response.data;
  } catch (error: unknown) {
    clearInterval(progressInterval);

    if (onProgress) {
      onProgress(100);
    }

    if (axios.isAxiosError(error)) {
      return {
        success: false,
        image: '',
        cached: false,
        generation_time: 0,
        prompt,
        error: error.message || '生成失败，请重试',
      };
    }

    return {
      success: false,
      image: '',
      cached: false,
      generation_time: 0,
      prompt,
      error: '未知错误',
    };
  }
};

export const checkHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  } catch {
    return {
      status: 'unhealthy',
      cache_size: 0,
    };
  }
};

export const getCachedImage = async (cacheKey: string): Promise<string | null> => {
  try {
    const response = await apiClient.get<{ success: boolean; image?: string; error?: string }>(
      `/cache/${cacheKey}`
    );
    if (response.data.success && response.data.image) {
      return response.data.image;
    }
    return null;
  } catch {
    return null;
  }
};

export const hexToDataUrl = (hex: string): string => {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const blob = new Blob([bytes], { type: 'image/png' });
  return URL.createObjectURL(blob);
};
