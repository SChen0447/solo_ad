import type { Book, Note, MonthlyStats, GenreStats, BookGenre } from '@/types';

export const calculateMonthlyStats = (books: Book[], notes: Note[]): MonthlyStats[] => {
  const monthMap = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, 0);
  }

  books.forEach((book) => {
    if (book.status === 'not_started') return;
    const start = new Date(book.startDate);
    const end = book.status === 'completed' ? new Date(book.updatedAt) : now;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const pagesPerDay = book.currentPage / days;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) || 0) + pagesPerDay);
      }
    }
  });

  return Array.from(monthMap.entries())
    .map(([month, pages]) => ({ month, pages: Math.round(pages) }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const calculateGenreStats = (books: Book[]): GenreStats[] => {
  const genreMap = new Map<BookGenre, number>();
  books.forEach((book) => {
    genreMap.set(book.genre, (genreMap.get(book.genre) || 0) + 1);
  });
  return Array.from(genreMap.entries()).map(([name, value]) => ({ name, value }));
};

export const calculateReadingProgress = (book: Book): number => {
  if (book.totalPages === 0) return 0;
  return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
};

export const getTotalBooksCount = (books: Book[]): number => books.length;

export const getCompletedBooksCount = (books: Book[]): number =>
  books.filter((b) => b.status === 'completed').length;

export const getTotalPagesRead = (books: Book[]): number =>
  books.reduce((sum, b) => sum + b.currentPage, 0);

export const getTotalNotesCount = (notes: Note[]): number => notes.length;

export const getQuoteNotes = (notes: Note[]): Note[] =>
  notes.filter((n) => n.isQuote);
