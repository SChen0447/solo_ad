export type BookCategory = '文学' | '科技' | '历史' | '艺术' | '生活'
export type BookStatus = 'available' | 'borrowed'
export type BorrowType = 'borrow' | 'return'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category: BookCategory
  description: string
  status: BookStatus
  borrowCount: number
  lastBorrower: string
  coverColor: string
}

export interface BorrowRecord {
  id: string
  bookId: string
  borrower: string
  type: BorrowType
  date: string
}

export interface Review {
  id: string
  bookId: string
  user: string
  rating: number
  comment: string
  date: string
}

export interface User {
  id: string
  name: string
  role: 'admin' | 'reader'
}
