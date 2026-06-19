export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  status: 'available' | 'borrowed';
  borrowedBy?: string;
  borrowedAt?: number;
  queue: string[];
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  readerId: string;
  borrowedAt: number;
  returnedAt?: number;
  readingProgress: number;
  status: 'reading' | 'completed';
}

export interface AddBookData {
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
}

export type PageType = 'books' | 'records';
