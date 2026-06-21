export type Category = '文学' | '科技' | '生活' | '童书';

export type BookStatus = '在架' | '借出' | '下架';

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: Category;
  total_stock: number;
  available_stock: number;
  status: BookStatus;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  book_id: number;
  book_title: string;
  borrower_name: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  returned: number;
  created_at: string;
}

export interface BooksResponse {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Stats {
  totalBooks: number;
  borrowedCount: number;
  overdueCount: number;
}

export type FilterCategory = '全部' | Category;
