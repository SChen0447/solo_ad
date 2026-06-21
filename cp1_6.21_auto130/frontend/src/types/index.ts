export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_color: string;
  cover_gradient: string;
  recommend_reason: string;
  likes: number;
  avg_rating: number;
  review_count: number;
}

export interface Review {
  id: string;
  book_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Loan {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
  title: string;
  author: string;
  cover_color: string;
  cover_gradient: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}
