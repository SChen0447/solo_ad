import { v4 as uuidv4 } from 'uuid';
import type { Book, Note, BookGenre, BookStatus } from '@/types';

const BOOKS_KEY = 'bookshelf_books';
const NOTES_KEY = 'bookshelf_notes';

const readFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeToStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateSampleBooks = (): Book[] => {
  const now = new Date();
  const books: Book[] = [];
  const sampleData = [
    { title: '百年孤独', author: '加西亚·马尔克斯', pages: 360, genre: '小说' as BookGenre, startOffset: 60, current: 200 },
    { title: '人类简史', author: '尤瓦尔·赫拉利', pages: 440, genre: '非虚构' as BookGenre, startOffset: 45, current: 440 },
    { title: '苏东坡传', author: '林语堂', pages: 320, genre: '传记' as BookGenre, startOffset: 30, current: 180 },
    { title: '三体', author: '刘慈欣', pages: 302, genre: '科幻' as BookGenre, startOffset: 20, current: 302 },
    { title: '万历十五年', author: '黄仁宇', pages: 288, genre: '历史' as BookGenre, startOffset: 10, current: 0 },
    { title: '查拉图斯特拉如是说', author: '尼采', pages: 350, genre: '哲学' as BookGenre, startOffset: 8, current: 120 },
    { title: '飞鸟集', author: '泰戈尔', pages: 200, genre: '诗歌' as BookGenre, startOffset: 5, current: 200 },
    { title: '活着', author: '余华', pages: 191, genre: '小说' as BookGenre, startOffset: 3, current: 191 },
    { title: '思考，快与慢', author: '丹尼尔·卡尼曼', pages: 450, genre: '非虚构' as BookGenre, startOffset: 40, current: 150 },
    { title: '乔布斯传', author: '沃尔特·艾萨克森', pages: 560, genre: '传记' as BookGenre, startOffset: 50, current: 560 },
  ];

  sampleData.forEach((s, idx) => {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - s.startOffset);
    const status: BookStatus =
      s.current === 0 ? 'not_started' : s.current >= s.pages ? 'completed' : 'reading';
    books.push({
      id: uuidv4(),
      title: s.title,
      author: s.author,
      totalPages: s.pages,
      currentPage: s.current,
      genre: s.genre,
      coverImage: `https://picsum.photos/seed/book${idx}/300/400`,
      startDate: startDate.toISOString().split('T')[0],
      status,
      createdAt: startDate.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  return books;
};

const generateSampleNotes = (books: Book[]): Note[] => {
  const notes: Note[] = [];
  const quotes = [
    '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。',
    '我们从哪里来？我们是谁？我们到哪里去？',
    '人生到处知何似，应似飞鸿踏雪泥。',
    '弱小和无知不是生存的障碍，傲慢才是。',
    '那一年的雪花飘落梅花开枝头，那一年的华清池旁留下太多愁。',
  ];

  books.forEach((book) => {
    if (book.status === 'not_started') return;
    const noteCount = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < noteCount; i++) {
      const created = new Date(book.startDate);
      created.setDate(created.getDate() + Math.floor(Math.random() * 10));
      notes.push({
        id: uuidv4(),
        bookId: book.id,
        title: `第 ${i + 1} 篇笔记`,
        content: i === 0 ? quotes[Math.floor(Math.random() * quotes.length)] : '这段内容让我思考良多，作者的笔触细腻入微，将情感和思想完美地融合在了一起。每读一行，都仿佛在与作者对话。',
        pageNumber: Math.max(1, Math.floor((i + 1) * (book.currentPage || book.totalPages) / noteCount)),
        isQuote: i === 0,
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
      });
    }
  });

  return notes;
};

export const loadAllBooks = (): Book[] => {
  const existing = readFromStorage<Book[]>(BOOKS_KEY, []);
  if (existing.length > 0) return existing;
  const samples = generateSampleBooks();
  writeToStorage(BOOKS_KEY, samples);
  const sampleNotes = generateSampleNotes(samples);
  writeToStorage(NOTES_KEY, sampleNotes);
  return samples;
};

export const loadAllNotes = (): Note[] => {
  const existing = readFromStorage<Note[]>(NOTES_KEY, []);
  if (existing.length > 0) return existing;
  return [];
};

export const saveBook = (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book => {
  const books = loadAllBooks();
  const now = new Date().toISOString();
  const newBook: Book = {
    ...book,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  books.push(newBook);
  writeToStorage(BOOKS_KEY, books);
  return newBook;
};

export const updateBook = (id: string, updates: Partial<Book>): Book | null => {
  const books = loadAllBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  let updated = { ...books[idx], ...updates, updatedAt: new Date().toISOString() };
  if (updates.currentPage !== undefined && updates.totalPages === undefined) {
    if (updated.currentPage >= updated.totalPages) updated.status = 'completed';
    else if (updated.currentPage > 0) updated.status = 'reading';
    else updated.status = 'not_started';
  }
  books[idx] = updated;
  writeToStorage(BOOKS_KEY, books);
  return updated;
};

export const deleteBook = (id: string): boolean => {
  const books = loadAllBooks();
  const filtered = books.filter((b) => b.id !== id);
  if (filtered.length === books.length) return false;
  writeToStorage(BOOKS_KEY, filtered);
  const notes = loadAllNotes();
  writeToStorage(
    NOTES_KEY,
    notes.filter((n) => n.bookId !== id),
  );
  return true;
};

export const getNotesByBookId = (bookId: string): Note[] => {
  const notes = loadAllNotes();
  return notes
    .filter((n) => n.bookId === bookId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
  const notes = loadAllNotes();
  const now = new Date().toISOString();
  const newNote: Note = {
    ...note,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  notes.push(newNote);
  writeToStorage(NOTES_KEY, notes);
  return newNote;
};

export const updateNote = (id: string, updates: Partial<Note>): Note | null => {
  const notes = loadAllNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
  writeToStorage(NOTES_KEY, notes);
  return notes[idx];
};

export const deleteNote = (id: string): boolean => {
  const notes = loadAllNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  writeToStorage(NOTES_KEY, filtered);
  return true;
};
