export type BookStatus = 'not_started' | 'reading' | 'completed';

export type BookGenre = '小说' | '非虚构' | '传记' | '科幻' | '历史' | '哲学' | '诗歌' | '其他';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  genre: BookGenre;
  coverImage: string;
  startDate: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  title: string;
  content: string;
  pageNumber: number;
  isQuote: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyStats {
  month: string;
  pages: number;
}

export interface GenreStats {
  name: BookGenre;
  value: number;
}

export type ViewType = 'shelf' | 'detail' | 'stats';

export const BOOK_GENRES: BookGenre[] = [
  '小说',
  '非虚构',
  '传记',
  '科幻',
  '历史',
  '哲学',
  '诗歌',
  '其他',
];

export const PRESET_COVERS: string[] = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=400&fit=crop',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop',
];
