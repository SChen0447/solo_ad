export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  pagesRead: number;
  tags: string[];
  isbn: string;
}

export interface BookContextType {
  books: Book[];
  loading: boolean;
  addBook: (book: Book) => void;
  updateProgress: (id: string, pagesRead: number) => void;
  updateBookInfo: (id: string, title: string, author: string) => void;
  filterByTags: (tags: string[]) => Book[];
  filterBooks: (keyword: string) => Book[];
  getRecentReadTags: () => string[];
  fetchInitialBooks: () => Promise<void>;
}
