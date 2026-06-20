import api from '@/api/http';
import type { Book, BookCondition } from '@/types';

export interface BookUploadData {
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  condition: BookCondition;
  coverImage?: File;
}

export interface ValuationResult {
  valuationMin: number;
  valuationMax: number;
  rarity: number;
  factors: {
    condition: number;
    rarity: number;
    age: number;
  };
}

export const bookApi = {
  async uploadBook(data: BookUploadData, onProgress?: (percent: number) => void): Promise<Book> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('author', data.author);
    formData.append('isbn', data.isbn);
    formData.append('publishYear', String(data.publishYear));
    formData.append('condition', String(data.condition));
    if (data.coverImage) {
      formData.append('coverImage', data.coverImage);
    }

    const response = await api.post<Book>('/books', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(percent);
        }
      }
    });
    return response.data;
  },

  async getBooks(params?: { status?: string; condition?: number; minPrice?: number; maxPrice?: number }): Promise<Book[]> {
    const response = await api.get<Book[]>('/books', { params });
    return response.data;
  },

  async getBookById(id: string): Promise<Book> {
    const response = await api.get<Book>(`/books/${id}`);
    return response.data;
  },

  async updateBookStatus(id: string, status: string, extra?: Record<string, any>): Promise<Book> {
    const response = await api.patch<Book>(`/books/${id}/status`, { status, ...extra });
    return response.data;
  },

  async calculateValuation(data: {
    isbn: string;
    publishYear: number;
    condition: BookCondition;
  }): Promise<ValuationResult> {
    const response = await api.post<ValuationResult>('/books/valuation', data);
    return response.data;
  },

  async getBorrowableBooks(params?: { condition?: number; minPrice?: number; maxPrice?: number }): Promise<Book[]> {
    const response = await api.get<Book[]>('/books/borrowable', { params });
    return response.data;
  }
};
