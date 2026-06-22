export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  tags: string[];
  readPages: number;
  totalReadingTime: number;
  status: 'unread' | 'reading' | 'completed';
  createdAt: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime: number;
  duration: number;
  pagesRead: number;
  date: string;
}

export interface Stats {
  weeklyReadingTime: number;
  monthlyPagesRead: number;
  currentlyReadingCount: number;
  totalBooks?: number;
  completedBooks?: number;
  totalReadingTime?: number;
}

export interface DailyReading {
  date: string;
  duration: number;
  books: { bookId: string; title: string }[];
}

export interface ImportResult {
  booksCount: number;
  sessionsCount: number;
}

const API_BASE = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const api = {
  health: async (): Promise<{ status: string; message: string }> => {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  getBooks: async (tags?: string[], status?: string): Promise<Book[]> => {
    const params = new URLSearchParams();
    if (tags && tags.length > 0) params.set('tags', tags.join(','));
    if (status && status !== 'all') params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/books${query}`);
    return handleResponse(res);
  },

  getBook: async (id: string): Promise<Book> => {
    const res = await fetch(`${API_BASE}/books/${id}`);
    return handleResponse(res);
  },

  addBook: async (data: {
    title: string;
    author: string;
    totalPages: number;
    tags: string[];
  }): Promise<Book> => {
    const res = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateBook: async (id: string, data: Partial<Book>): Promise<Book> => {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteBook: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  getAllTags: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/tags`);
    return handleResponse(res);
  },

  getSessions: async (bookId?: string): Promise<ReadingSession[]> => {
    const query = bookId ? `?bookId=${bookId}` : '';
    const res = await fetch(`${API_BASE}/sessions${query}`);
    return handleResponse(res);
  },

  addReadingSession: async (data: {
    bookId: string;
    startTime: number;
    endTime: number;
    pagesRead: number;
  }): Promise<ReadingSession> => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getStats: async (): Promise<Stats> => {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse(res);
  },

  getDailyReadings: async (): Promise<DailyReading[]> => {
    const res = await fetch(`${API_BASE}/stats/daily`);
    return handleResponse(res);
  },

  exportData: async (): Promise<{ books: Book[]; sessions: ReadingSession[]; exportedAt: string }> => {
    const res = await fetch(`${API_BASE}/export`, { method: 'POST' });
    return handleResponse(res);
  },

  importData: async (data: { books: Book[]; sessions: ReadingSession[] }): Promise<ImportResult> => {
    const res = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

export default api;
