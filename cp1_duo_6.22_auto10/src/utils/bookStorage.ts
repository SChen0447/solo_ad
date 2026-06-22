export type BookStatus = 'reading' | 'finished' | 'shelved';

export interface ReadingRecord {
  id: string;
  date: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  createdAt: number;
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  status: BookStatus;
  records: ReadingRecord[];
  notes: Note[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'reading_tracker_books';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function readAll(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Book[];
  } catch {
    return [];
  }
}

function writeAll(books: Book[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

export function getAllBooks(): Book[] {
  return readAll();
}

export function getBookById(id: string): Book | undefined {
  const books = readAll();
  return books.find(b => b.id === id);
}

export function getBooksByStatus(status?: BookStatus): Book[] {
  const books = readAll();
  if (!status) return books;
  return books.filter(b => b.status === status);
}

export function addBook(book: Omit<Book, 'id' | 'records' | 'notes' | 'createdAt' | 'updatedAt'>): Book {
  const books = readAll();
  const now = Date.now();
  const newBook: Book = {
    ...book,
    id: generateId(),
    records: [],
    notes: [],
    createdAt: now,
    updatedAt: now
  };
  books.push(newBook);
  writeAll(books);
  return newBook;
}

export function updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'records' | 'notes'>>): Book | undefined {
  const books = readAll();
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) return undefined;
  books[idx] = { ...books[idx], ...updates, updatedAt: Date.now() };
  writeAll(books);
  return books[idx];
}

export function deleteBook(id: string): boolean {
  const books = readAll();
  const filtered = books.filter(b => b.id !== id);
  if (filtered.length === books.length) return false;
  writeAll(filtered);
  return true;
}

export function addReadingRecord(bookId: string, record: Omit<ReadingRecord, 'id' | 'createdAt'>): ReadingRecord | undefined {
  const books = readAll();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return undefined;
  const newRecord: ReadingRecord = {
    ...record,
    id: generateId(),
    createdAt: Date.now()
  };
  books[idx].records.push(newRecord);
  books[idx].updatedAt = Date.now();
  writeAll(books);
  return newRecord;
}

export function deleteReadingRecord(bookId: string, recordId: string): boolean {
  const books = readAll();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return false;
  const before = books[idx].records.length;
  books[idx].records = books[idx].records.filter(r => r.id !== recordId);
  if (books[idx].records.length === before) return false;
  books[idx].updatedAt = Date.now();
  writeAll(books);
  return true;
}

export function addNote(bookId: string, content: string): Note | undefined {
  const books = readAll();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return undefined;
  const now = Date.now();
  const newNote: Note = {
    id: generateId(),
    content,
    createdAt: now,
    updatedAt: now
  };
  books[idx].notes.push(newNote);
  books[idx].updatedAt = now;
  writeAll(books);
  return newNote;
}

export function updateNote(bookId: string, noteId: string, content: string): Note | undefined {
  const books = readAll();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return undefined;
  const noteIdx = books[idx].notes.findIndex(n => n.id === noteId);
  if (noteIdx === -1) return undefined;
  books[idx].notes[noteIdx] = {
    ...books[idx].notes[noteIdx],
    content,
    updatedAt: Date.now()
  };
  books[idx].updatedAt = Date.now();
  writeAll(books);
  return books[idx].notes[noteIdx];
}

export function deleteNote(bookId: string, noteId: string): boolean {
  const books = readAll();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return false;
  const before = books[idx].notes.length;
  books[idx].notes = books[idx].notes.filter(n => n.id !== noteId);
  if (books[idx].notes.length === before) return false;
  books[idx].updatedAt = Date.now();
  writeAll(books);
  return true;
}

export function getBookCurrentPage(book: Book): number {
  if (!book.records.length) return 0;
  return book.records.reduce((max, r) => Math.max(max, r.endPage), 0);
}

export function getBookTotalPagesRead(book: Book): number {
  return book.records.reduce((sum, r) => sum + r.pagesRead, 0);
}
