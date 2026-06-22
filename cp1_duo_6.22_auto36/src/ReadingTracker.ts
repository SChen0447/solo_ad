import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  tags: string[];
  readPages: number;
  totalReadingTime: number;
  status: 'unread' | 'reading' | 'completed';
  createdAt: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime: number;
  duration: number;
  pagesRead: number;
  date: string;
}

export interface Stats {
  weeklyReadingTime: number;
  monthlyPagesRead: number;
  currentlyReadingCount: number;
}

export interface DailyReading {
  date: string;
  duration: number;
  books: { bookId: string; title: string }[];
}

const BOOKS_KEY = 'reading_tracker_books';
const SESSIONS_KEY = 'reading_tracker_sessions';

class ReadingTracker {
  private activeSessions: Map<string, { startTime: number; bookId: string }> = new Map();

  private loadFromStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  getBooks(): Book[] {
    return this.loadFromStorage<Book>(BOOKS_KEY);
  }

  saveBooks(books: Book[]): void {
    this.saveToStorage(BOOKS_KEY, books);
  }

  getSessions(): ReadingSession[] {
    return this.loadFromStorage<ReadingSession>(SESSIONS_KEY);
  }

  saveSessions(sessions: ReadingSession[]): void {
    this.saveToStorage(SESSIONS_KEY, sessions);
  }

  addBook(title: string, author: string, totalPages: number, tags: string[]): Book {
    const books = this.getBooks();
    const newBook: Book = {
      id: uuidv4(),
      title,
      author,
      totalPages,
      tags,
      readPages: 0,
      totalReadingTime: 0,
      status: 'unread',
      createdAt: Date.now()
    };
    books.push(newBook);
    this.saveBooks(books);
    return newBook;
  }

  updateBook(bookId: string, updates: Partial<Book>): Book | null {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === bookId);
    if (index === -1) return null;
    books[index] = { ...books[index], ...updates };
    this.saveBooks(books);
    return books[index];
  }

  deleteBook(bookId: string): boolean {
    const books = this.getBooks().filter(b => b.id !== bookId);
    const sessions = this.getSessions().filter(s => s.bookId !== bookId);
    this.saveBooks(books);
    this.saveSessions(sessions);
    return true;
  }

  startReadingSession(bookId: string): string {
    const sessionId = uuidv4();
    this.activeSessions.set(sessionId, {
      startTime: Date.now(),
      bookId
    });
    return sessionId;
  }

  endReadingSession(sessionId: string, pagesRead: number): ReadingSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const endTime = Date.now();
    const duration = Math.floor((endTime - session.startTime) / 1000);
    const date = new Date(session.startTime).toISOString().split('T')[0];

    const readingSession: ReadingSession = {
      id: uuidv4(),
      bookId: session.bookId,
      startTime: session.startTime,
      endTime,
      duration,
      pagesRead,
      date
    };

    const sessions = this.getSessions();
    sessions.push(readingSession);
    this.saveSessions(sessions);

    const books = this.getBooks();
    const bookIndex = books.findIndex(b => b.id === session.bookId);
    if (bookIndex !== -1) {
      const book = books[bookIndex];
      const newReadPages = Math.min(book.readPages + pagesRead, book.totalPages);
      book.readPages = newReadPages;
      book.totalReadingTime += duration;
      if (newReadPages >= book.totalPages) {
        book.status = 'completed';
      } else if (newReadPages > 0) {
        book.status = 'reading';
      }
      books[bookIndex] = book;
      this.saveBooks(books);
    }

    this.activeSessions.delete(sessionId);
    return readingSession;
  }

  addReadingSession(
    bookId: string,
    startTime: number,
    endTime: number,
    pagesRead: number
  ): ReadingSession {
    const duration = Math.floor((endTime - startTime) / 1000);
    const date = new Date(startTime).toISOString().split('T')[0];

    const readingSession: ReadingSession = {
      id: uuidv4(),
      bookId,
      startTime,
      endTime,
      duration,
      pagesRead,
      date
    };

    const sessions = this.getSessions();
    sessions.push(readingSession);
    this.saveSessions(sessions);

    const books = this.getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
      const book = books[bookIndex];
      const newReadPages = Math.min(book.readPages + pagesRead, book.totalPages);
      book.readPages = newReadPages;
      book.totalReadingTime += duration;
      if (newReadPages >= book.totalPages) {
        book.status = 'completed';
      } else if (newReadPages > 0) {
        book.status = 'reading';
      }
      books[bookIndex] = book;
      this.saveBooks(books);
    }

    return readingSession;
  }

  getStats(): Stats {
    const books = this.getBooks();
    const sessions = this.getSessions();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    let weeklyReadingTime = 0;
    let monthlyPagesRead = 0;

    sessions.forEach(session => {
      if (session.startTime >= weekStart.getTime()) {
        weeklyReadingTime += session.duration;
      }
      if (session.startTime >= monthStart.getTime()) {
        monthlyPagesRead += session.pagesRead;
      }
    });

    const currentlyReadingCount = books.filter(b => b.status === 'reading').length;

    return {
      weeklyReadingTime,
      monthlyPagesRead,
      currentlyReadingCount
    };
  }

  getLast30DaysReadings(): DailyReading[] {
    const sessions = this.getSessions();
    const books = this.getBooks();
    const result: DailyReading[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        duration: 0,
        books: []
      });
    }

    const dateMap = new Map(result.map(d => [d.date, d]));

    sessions.forEach(session => {
      const daily = dateMap.get(session.date);
      if (daily) {
        daily.duration += session.duration;
        const book = books.find(b => b.id === session.bookId);
        if (book && !daily.books.find(b => b.bookId === book.id)) {
          daily.books.push({ bookId: book.id, title: book.title });
        }
      }
    });

    return result;
  }

  exportData(): string {
    return JSON.stringify(
      {
        books: this.getBooks(),
        sessions: this.getSessions(),
        exportedAt: new Date().toISOString()
      },
      null,
      2
    );
  }

  importData(jsonStr: string): { booksCount: number; sessionsCount: number } {
    const data = JSON.parse(jsonStr);
    if (data.books && Array.isArray(data.books)) {
      this.saveBooks(data.books);
    }
    if (data.sessions && Array.isArray(data.sessions)) {
      this.saveSessions(data.sessions);
    }
    return {
      booksCount: data.books?.length || 0,
      sessionsCount: data.sessions?.length || 0
    };
  }

  filterBooks(tags: string[], status: string): Book[] {
    let books = this.getBooks();
    if (status && status !== 'all') {
      books = books.filter(b => b.status === status);
    }
    if (tags && tags.length > 0) {
      books = books.filter(b => tags.some(t => b.tags.includes(t)));
    }
    return books;
  }

  getAllTags(): string[] {
    const books = this.getBooks();
    const tagSet = new Set<string>();
    books.forEach(b => b.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }
}

export const readingTracker = new ReadingTracker();
export default ReadingTracker;
