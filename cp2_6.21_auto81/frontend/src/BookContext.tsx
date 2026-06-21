import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Book, BookContextType } from './types';

const BookContext = createContext<BookContextType | undefined>(undefined);

const API_BASE = 'http://localhost:3001/api';

export const BookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInitialBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/books`);
      const data = await res.json();
      const withProgress: Book[] = data.map((b: Omit<Book, 'pagesRead'>) => ({
        ...b,
        pagesRead: Math.floor(Math.random() * (b.totalPages + 1))
      }));
      setBooks(withProgress);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addBook = useCallback((book: Book) => {
    setBooks(prev => {
      if (prev.find(b => b.id === book.id)) return prev;
      return [...prev, book];
    });
  }, []);

  const updateProgress = useCallback((id: string, pagesRead: number) => {
    setBooks(prev =>
      prev.map(b => (b.id === id ? { ...b, pagesRead: Math.min(Math.max(pagesRead, 0), b.totalPages) } : b))
    );
  }, []);

  const updateBookInfo = useCallback((id: string, title: string, author: string) => {
    setBooks(prev =>
      prev.map(b => (b.id === id ? { ...b, title, author } : b))
    );
  }, []);

  const filterByTags = useCallback(
    (tags: string[]) => {
      if (tags.length === 0) return books;
      return books.filter(b => tags.some(t => b.tags.includes(t)));
    },
    [books]
  );

  const getRecentReadTags = useCallback(() => {
    const sorted = [...books]
      .filter(b => b.pagesRead > 0)
      .sort((a, b) => (b.pagesRead / b.totalPages) - (a.pagesRead / a.totalPages))
      .slice(0, 3);
    const tagSet = new Set<string>();
    sorted.forEach(b => b.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [books]);

  return (
    <BookContext.Provider
      value={{
        books,
        loading,
        addBook,
        updateProgress,
        updateBookInfo,
        filterByTags,
        getRecentReadTags,
        fetchInitialBooks
      }}
    >
      {children}
    </BookContext.Provider>
  );
};

export const useBooks = (): BookContextType => {
  const ctx = useContext(BookContext);
  if (!ctx) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return ctx;
};
