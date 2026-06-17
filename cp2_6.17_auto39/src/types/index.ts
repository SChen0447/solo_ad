export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  currentPage: number;
  createdAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';
