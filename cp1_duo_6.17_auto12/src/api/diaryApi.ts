import axios from 'axios';
import { DiaryEntry, CreateDiaryRequest, SearchDiaryRequest, UploadedMedia, UploadProgress } from '../types';

const API_BASE = '/api';

export const diaryApi = {
  async getDiaries(year?: number, month?: number): Promise<DiaryEntry[]> {
    const params: Record<string, number> = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    
    const response = await axios.get(`${API_BASE}/diary`, { params });
    return response.data;
  },

  async createDiary(data: CreateDiaryRequest): Promise<DiaryEntry> {
    const response = await axios.post(`${API_BASE}/diary`, data);
    return response.data;
  },

  async searchDiaries(params: SearchDiaryRequest): Promise<DiaryEntry[]> {
    const response = await axios.get(`${API_BASE}/diary/search`, { params });
    return response.data;
  },

  async deleteDiary(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/diary/${id}`);
  },

  async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const formData = new FormData();
          formData.append('file', blob, file.name);

          axios.post(`${API_BASE}/upload`, formData, {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total && onProgress) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress({
                  filename: file.name,
                  progress,
                  status: 'uploading'
                });
              }
            }
          }).then(response => {
            if (onProgress) {
              onProgress({
                filename: file.name,
                progress: 100,
                status: 'completed'
              });
            }
            resolve(response.data);
          }).catch(error => {
            if (onProgress) {
              onProgress({
                filename: file.name,
                progress: 0,
                status: 'error'
              });
            }
            reject(error);
          });
        }, file.type);
      };

      img.onerror = () => {
        const formData = new FormData();
        formData.append('file', file);

        axios.post(`${API_BASE}/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress({
                filename: file.name,
                progress,
                status: 'uploading'
              });
            }
          }
        }).then(response => {
          if (onProgress) {
            onProgress({
              filename: file.name,
              progress: 100,
              status: 'completed'
            });
          }
          resolve(response.data);
        }).catch(error => {
          if (onProgress) {
            onProgress({
              filename: file.name,
              progress: 0,
              status: 'error'
            });
          }
          reject(error);
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }
};
