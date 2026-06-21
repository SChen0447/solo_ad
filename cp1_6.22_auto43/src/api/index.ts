import axios from 'axios';
import type { Book, Loan, BooksResponse, Stats, FilterCategory } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const bookApi = {
  getBooks: (
    search: string = '',
    category: FilterCategory = '全部',
    page: number = 1,
    limit: number = 12
  ): Promise<BooksResponse> =>
    api
      .get('/books', { params: { search, category, page, limit } })
      .then((res) => res.data),

  getBook: (id: number): Promise<Book> =>
    api.get(`/books/${id}`).then((res) => res.data),

  addBook: (data: {
    title: string;
    author: string;
    isbn: string;
    category: string;
    total_stock: number;
  }): Promise<Book> => api.post('/books', data).then((res) => res.data),

  updateBook: (
    id: number,
    data: Partial<{
      title: string;
      author: string;
      isbn: string;
      category: string;
      total_stock: number;
      status: string;
    }>
  ): Promise<Book> => api.put(`/books/${id}`, data).then((res) => res.data),

  deleteBook: (id: number): Promise<{ message: string }> =>
    api.delete(`/books/${id}`).then((res) => res.data),
};

export const loanApi = {
  getLoans: (): Promise<Loan[]> =>
    api.get('/loans').then((res) => res.data),

  createLoan: (data: {
    book_id: number;
    borrower_name: string;
    expected_return_date: string;
  }): Promise<Loan> => api.post('/loans', data).then((res) => res.data),

  updateLoan: (
    id: number,
    data: Partial<{
      actual_return_date: string;
      returned: boolean;
    }>
  ): Promise<Loan> => api.put(`/loans/${id}`, data).then((res) => res.data),
};

export const statsApi = {
  getStats: (): Promise<Stats> =>
    api.get('/stats').then((res) => res.data),
};
