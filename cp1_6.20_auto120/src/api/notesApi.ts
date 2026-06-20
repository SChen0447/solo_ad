import axios from 'axios';
import type { Note } from '@/types';

export const fetchNotes = () => axios.get<Note[]>('/api/notes');

export const fetchNoteById = (id: string) => axios.get<Note>(`/api/notes/${id}`);

export const createNote = (data: Partial<Note>) => axios.post<Note>('/api/notes', data);

export const updateNote = (id: string, data: Partial<Note>) => axios.put<Note>(`/api/notes/${id}`, data);

export const transcribeFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/api/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const extractKeywords = (text: string) => axios.post('/api/keywords', { text });
