import type { Book, Review, Loan, ApiResponse } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || '请求失败');
  }
  
  return data;
}

export const booksApi = {
  getBooks: () => 
    request<ApiResponse<Book[]>>('/books'),
  
  getBook: (id: string) => 
    request<ApiResponse<Book>>(`/books/${id}`),
  
  getReviews: (bookId: string, page = 1, limit = 20) => 
    request<ApiResponse<Review[]>>(`/books/${bookId}/reviews?page=${page}&limit=${limit}`),
  
  rateBook: (bookId: string, rating: number, comment: string, userName: string) => 
    request<ApiResponse<{ book: Book; review: Review }>>(`/books/${bookId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, userName }),
    }),
  
  likeBook: (bookId: string) => 
    request<ApiResponse<Book>>(`/books/${bookId}/like`, {
      method: 'POST',
    }),
  
  getRanking: () => 
    request<ApiResponse<Book[]>>('/books/ranking/list'),
};

export const loansApi = {
  getLoans: (userId = 'user-001') => 
    request<ApiResponse<Loan[]>>(`/loans?userId=${userId}`),
  
  borrowBook: (bookId: string, userId = 'user-001', userName = '张小明') => 
    request<ApiResponse<Loan>>('/loans/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId, userId, userName }),
    }),
  
  returnBook: (loanId: string) => 
    request<ApiResponse<Loan>>('/loans/return', {
      method: 'POST',
      body: JSON.stringify({ loanId }),
    }),
  
  checkLoanStatus: (bookId: string, userId = 'user-001') => 
    request<ApiResponse<Loan | null>>(`/loans/check/${bookId}?userId=${userId}`),
};
