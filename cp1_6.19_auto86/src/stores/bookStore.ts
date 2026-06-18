import { create } from 'zustand';
import { mockBooks } from '@/data/mockBooks';
import type { Book, SortOption } from '@/types';

interface BookStore {
  books: Book[];
  searchQuery: string;
  sortOption: SortOption;
  isLoading: boolean;
  getFilteredBooks: () => Book[];
  getBookById: (id: string) => Book | undefined;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  updateBookStock: (bookId: string, delta: number) => void;
}

const sortBooks = (books: Book[], option: SortOption): Book[] => {
  const sorted = [...books];
  switch (option) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'year-asc':
      return sorted.sort((a, b) => a.publishYear - b.publishYear);
    case 'year-desc':
      return sorted.sort((a, b) => b.publishYear - a.publishYear);
    default:
      return sorted;
  }
};

const filterBooks = (books: Book[], query: string): Book[] => {
  if (!query.trim()) return books;
  const lowerQuery = query.toLowerCase();
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery)
  );
};

export const useBookStore = create<BookStore>((set, get) => ({
  books: mockBooks,
  searchQuery: '',
  sortOption: 'price-asc',
  isLoading: false,

  getFilteredBooks: () => {
    const { books, searchQuery, sortOption } = get();
    const filtered = filterBooks(books, searchQuery);
    return sortBooks(filtered, sortOption);
  },

  getBookById: (id: string) => {
    const { books } = get();
    return books.find((book) => book.id === id);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSortOption: (option: SortOption) => {
    set({ sortOption: option });
  },

  updateBookStock: (bookId: string, delta: number) => {
    set((state) => ({
      books: state.books.map((book) => {
        if (book.id === bookId) {
          const newStock = Math.max(0, book.stock + delta);
          const newStatus =
            newStock === 0
              ? 'out-of-stock'
              : newStock <= 3
              ? 'low-stock'
              : 'in-stock';
          return {
            ...book,
            stock: newStock,
            status: newStatus,
          };
        }
        return book;
      }),
    }));
  },
}));
