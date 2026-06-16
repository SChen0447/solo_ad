import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export interface StyleInfo {
  key: string;
  name: string;
  preview: {
    bg: string;
    accent: string;
    text: string;
  };
}

export interface SizeInfo {
  key: string;
  name: string;
  width: number;
  height: number;
  sub: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  size_key: string;
  name: string;
  sub: string;
  width: number;
  height: number;
  adjustedUrl?: string;
}

export interface Adjustments {
  title_size: number;
  title_color: string;
  bg_color: string;
  decoration_density: number;
}

export interface GenerateRequest {
  theme: string;
  style: string;
  sizes: string[];
}

export interface AdjustRequest {
  theme: string;
  style: string;
  size_key: string;
  adjustments: Adjustments;
}

export const getStyles = async (): Promise<StyleInfo[]> => {
  const res = await api.get('/styles');
  return res.data;
};

export const getSizes = async (): Promise<SizeInfo[]> => {
  const res = await api.get('/sizes');
  return res.data;
};

export const generateImages = async (
  data: GenerateRequest
): Promise<GeneratedImage[]> => {
  const res = await api.post('/image-generate', data);
  return res.data.images || [];
};

export const adjustImage = async (data: AdjustRequest): Promise<string> => {
  const res = await api.post('/image-adjust', data, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  return url;
};

export const getDownloadUrl = (filename: string): string => {
  return `/api/image/download/${filename}`;
};

export default api;
