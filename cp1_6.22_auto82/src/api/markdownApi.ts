import axios from 'axios';
import type { Markdown } from '../../types';

const API_BASE = '/api/markdowns';

export const getMarkdowns = (): Promise<Markdown[]> => {
  return axios.get<Markdown[]>(API_BASE).then((res) => res.data);
};

export const addMarkdown = (data: Omit<Markdown, 'id' | 'createdAt'>): Promise<Markdown> => {
  return axios.post<Markdown>(API_BASE, data).then((res) => res.data);
};

export const updateMarkdown = (id: string, data: Partial<Omit<Markdown, 'id' | 'createdAt'>>): Promise<Markdown> => {
  return axios.put<Markdown>(`${API_BASE}/${id}`, data).then((res) => res.data);
};

export const deleteMarkdown = (id: string): Promise<{ message: string; deleted: Markdown }> => {
  return axios.delete(`${API_BASE}/${id}`).then((res) => res.data);
};
