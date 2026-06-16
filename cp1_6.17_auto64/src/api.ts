import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface Book {
  id: number;
  title: string;
  author: string;
  tags: string[];
  rating: number;
  cover: string;
  description: string;
  pages: number;
}

export interface Note {
  id: number;
  content: string;
  created_at: number;
}

export interface ReadingBook extends Book {
  current_page: number;
  total_pages: number;
  notes: Note[];
  daily_reading: { date: string; minutes: number }[];
  added_at: number;
}

export interface RecommendResponse {
  books: Book[];
  total: number;
}

export interface ListResponse {
  list: ReadingBook[];
}

export const getTags = async (): Promise<string[]> => {
  const res = await api.get('/tags');
  return res.data.tags;
};

export const getRecommendations = async (tags: string[], count = 6): Promise<RecommendResponse> => {
  const res = await api.post('/recommend', { tags, count });
  return res.data;
};

export const getReadingList = async (): Promise<ListResponse> => {
  const res = await api.get('/tracker/list');
  return res.data;
};

export const addToReadingList = async (bookId: number): Promise<{ success: boolean; book?: ReadingBook; message?: string }> => {
  const res = await api.post('/tracker/add', { book_id: bookId });
  return res.data;
};

export const removeFromReadingList = async (bookId: number): Promise<{ success: boolean }> => {
  const res = await api.post('/tracker/remove', { book_id: bookId });
  return res.data;
};

export const updateProgress = async (bookId: number, currentPage: number): Promise<{ success: boolean; book: ReadingBook }> => {
  const res = await api.post('/tracker/progress', { book_id: bookId, current_page: currentPage });
  return res.data;
};

export const addNote = async (bookId: number, content: string): Promise<{ success: boolean; book: ReadingBook }> => {
  const res = await api.post('/tracker/note/add', { book_id: bookId, content });
  return res.data;
};

export const deleteNote = async (bookId: number, noteId: number): Promise<{ success: boolean; book: ReadingBook }> => {
  const res = await api.post('/tracker/note/delete', { book_id: bookId, note_id: noteId });
  return res.data;
};

export const checkInList = async (bookId: number): Promise<{ in_list: boolean }> => {
  const res = await api.get(`/tracker/check/${bookId}`);
  return res.data;
};
