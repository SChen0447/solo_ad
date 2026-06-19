export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  status: 'available' | 'borrowed';
  borrower?: string;
  borrowDate?: string;
  reserveQueue: string[];
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  readerName: string;
  borrowDate: string;
  returnDate?: string;
  status: 'reading' | 'completed';
  progress: number;
}

export interface BorrowHistoryItem {
  id: string;
  readerName: string;
  borrowDate: string;
  returnDate?: string;
  status: 'reading' | 'completed';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export type PageType = 'home' | 'records';
