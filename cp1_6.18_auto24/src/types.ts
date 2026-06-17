export type BookType = 'book' | 'article' | 'paper'
export type BookStatus = 'wishlist' | 'reading' | 'finished'

export interface Book {
  id: string
  title: string
  author: string
  type: BookType
  status: BookStatus
  rating: number
  note: string
  createdAt: Date
  updatedAt: Date
}

export type BookTypeLabel = '书' | '文章' | '论文'
export type BookStatusLabel = '想读' | '在读' | '读完'

export const BOOK_TYPE_MAP: Record<BookType, BookTypeLabel> = {
  book: '书',
  article: '文章',
  paper: '论文',
}

export const BOOK_STATUS_MAP: Record<BookStatus, BookStatusLabel> = {
  wishlist: '想读',
  reading: '在读',
  finished: '读完',
}
