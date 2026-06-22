export type BookCategory = '文学' | '科技' | '生活' | '教育' | '艺术';
export type BookCondition = '全新' | '九成新' | '有笔记';
export type BookStatus = 'available' | 'exchanged';

export interface User {
  id: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: string;
  preferences: BookCategory[];
  browseHistory: string[];
  exchangeHistory: ExchangeRecord[];
}

export interface Book {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  author: string;
  isbn?: string;
  category: BookCategory;
  condition: BookCondition;
  coverImage: string;
  exchangePreference: BookCategory[];
  status: BookStatus;
  exchangeCount: number;
  createdAt: string;
  tags: string[];
}

export interface ExchangeRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  partnerId: string;
  partnerName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  isbn?: string;
  category: BookCategory;
  condition: BookCondition;
  coverImage: string;
  exchangePreference: BookCategory[];
  tags: string[];
}

export interface SearchBooksQuery {
  keyword?: string;
  category?: BookCategory;
  condition?: BookCondition;
}
