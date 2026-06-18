import { create } from 'zustand';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  callNumber: string;
  shelf: string;
  status: 'available' | 'borrowed';
  cover: string;
  description: string;
  shelfInfo?: { id: string; x: number; y: number; label: string };
}

interface Booking {
  id: string;
  bookId: string;
  bookTitle: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  createdAt: string;
}

interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
}

interface Reminder {
  id: string;
  bookId: string;
  bookTitle: string;
  dueDate: string;
  status: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface LibraryStore {
  books: Book[];
  bookings: Booking[];
  borrowRecords: BorrowRecord[];
  reminders: Reminder[];
  toasts: Toast[];
  selectedBook: Book | null;
  searchKeyword: string;
  setSearchKeyword: (kw: string) => void;
  setBooks: (books: Book[]) => void;
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  addBorrowRecord: (record: BorrowRecord) => void;
  updateBorrowRecord: (id: string, updates: Partial<BorrowRecord>) => void;
  setReminders: (reminders: Reminder[]) => void;
  dismissReminder: (id: string) => void;
  selectBook: (book: Book | null) => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  updateBookStatus: (bookId: string, status: Book['status']) => void;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  books: [],
  bookings: [],
  borrowRecords: [],
  reminders: [],
  toasts: [],
  selectedBook: null,
  searchKeyword: '',

  setSearchKeyword: (kw) => set({ searchKeyword: kw }),

  setBooks: (books) => set({ books }),

  addBooking: (booking) => set((s) => ({ bookings: [...s.bookings, booking] })),

  updateBookingStatus: (id, status) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    })),

  addBorrowRecord: (record) => set((s) => ({ borrowRecords: [...s.borrowRecords, record] })),

  updateBorrowRecord: (id, updates) =>
    set((s) => ({
      borrowRecords: s.borrowRecords.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  setReminders: (reminders) => set({ reminders }),

  dismissReminder: (id) =>
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

  selectBook: (book) => set({ selectedBook: book }),

  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  updateBookStatus: (bookId, status) =>
    set((s) => ({
      books: s.books.map((b) => (b.id === bookId ? { ...b, status } : b)),
    })),
}));

export type { Book, Booking, BorrowRecord, Reminder, Toast };
