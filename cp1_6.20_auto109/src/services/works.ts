import axiosInstance from './api';
import { Work, WorksResponse } from '../types';

export const getWorks = async (page = 1, limit = 20): Promise<WorksResponse> => {
  const response = await axiosInstance.get(`/works?page=${page}&limit=${limit}`);
  return response.data;
};

export const getWork = async (id: number): Promise<{ work: Work }> => {
  const response = await axiosInstance.get(`/works/${id}`);
  return response.data;
};

export const uploadWork = async (
  title: string,
  description: string,
  image: File
): Promise<{ work: Work }> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('image', image);

  const response = await axiosInstance.post('/works', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
