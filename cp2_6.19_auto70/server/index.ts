import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3008;

app.use(cors());
app.use(express.json());

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  status: 'available' | 'borrowed';
  borrowedBy?: string;
  borrowedAt?: number;
  queue: string[];
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  readerId: string;
  borrowedAt: number;
  returnedAt?: number;
  readingProgress: number;
  status: 'reading' | 'completed';
}

export interface Notification {
  id: string;
  readerId: string;
  message: string;
  createdAt: number;
}

const CURRENT_READER_ID = 'reader_001';
const CURRENT_READER_NAME = '张小明';

const categories = ['文学', '科技', '历史', '艺术', '哲学', '经济', '教育'];

const books: Book[] = [
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    isbn: '9787544253994',
    category: '文学',
    coverUrl: 'https://picsum.photos/seed/book1/200/280',
    status: 'available',
    queue: [],
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    isbn: '9787508647357',
    category: '历史',
    coverUrl: 'https://picsum.photos/seed/book2/200/280',
    status: 'borrowed',
    borrowedBy: 'reader_002',
    borrowedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    queue: [CURRENT_READER_ID],
  },
  {
    id: uuidv4(),
    title: 'JavaScript高级程序设计',
    author: 'Nicholas C. Zakas',
    isbn: '9787115275790',
    category: '科技',
    coverUrl: 'https://picsum.photos/seed/book3/200/280',
    status: 'available',
    queue: [],
  },
  {
    id: uuidv4(),
    title: '艺术的故事',
    author: '贡布里希',
    isbn: '9787807463726',
    category: '艺术',
    coverUrl: 'https://picsum.photos/seed/book4/200/280',
    status: 'borrowed',
    borrowedBy: CURRENT_READER_ID,
    borrowedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    queue: [],
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    isbn: '9787506365437',
    category: '文学',
    coverUrl: 'https://picsum.photos/seed/book5/200/280',
    status: 'available',
    queue: [],
  },
  {
    id: uuidv4(),
    title: '国富论',
    author: '亚当·斯密',
    isbn: '9787100081559',
    category: '经济',
    coverUrl: 'https://picsum.photos/seed/book6/200/280',
    status: 'available',
    queue: [],
  },
  {
    id: uuidv4(),
    title: '理想国',
    author: '柏拉图',
    isbn: '9787100017565',
    category: '哲学',
    coverUrl: 'https://picsum.photos/seed/book7/200/280',
    status: 'borrowed',
    borrowedBy: CURRENT_READER_ID,
    borrowedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    queue: [],
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    isbn: '9787536692930',
    category: '科技',
    coverUrl: 'https://picsum.photos/seed/book8/200/280',
    status: 'available',
    queue: [],
  },
];

const borrowRecords: BorrowRecord[] = [
  {
    id: uuidv4(),
    bookId: books[3].id,
    bookTitle: '艺术的故事',
    readerId: CURRENT_READER_ID,
    borrowedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    readingProgress: 42,
    status: 'reading',
  },
  {
    id: uuidv4(),
    bookId: books[6].id,
    bookTitle: '理想国',
    readerId: CURRENT_READER_ID,
    borrowedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    readingProgress: 15,
    status: 'reading',
  },
  {
    id: uuidv4(),
    bookId: 'old_book_1',
    bookTitle: '红楼梦',
    readerId: CURRENT_READER_ID,
    borrowedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    returnedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    readingProgress: 100,
    status: 'completed',
  },
];

const notifications: Notification[] = [];

// ============ API Routes ============

// Get all books with optional filters
app.get('/api/books', (req: Request, res: Response) => {
  const { search, category } = req.query;
  let result = [...books];

  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(keyword) ||
        b.author.toLowerCase().includes(keyword)
    );
  }

  if (category && typeof category === 'string' && category !== '全部') {
    result = result.filter((b) => b.category === category);
  }

  res.json(result);
});

// Get book categories
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(['全部', ...categories]);
});

// Add a new book
app.post('/api/books', (req: Request, res: Response) => {
  const { title, author, isbn, category, coverUrl } = req.body;

  if (!title || !author || !isbn || !category || !coverUrl) {
    return res.status(400).json({ error: '所有字段均为必填项' });
  }

  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    isbn,
    category,
    coverUrl,
    status: 'available',
    queue: [],
  };

  books.unshift(newBook);
  res.status(201).json(newBook);
});

// Borrow a book
app.post('/api/books/:id/borrow', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.status !== 'available') {
    return res.status(400).json({ error: '图书当前不可借' });
  }

  const readerId = CURRENT_READER_ID;
  book.status = 'borrowed';
  book.borrowedBy = readerId;
  book.borrowedAt = Date.now();

  const record: BorrowRecord = {
    id: uuidv4(),
    bookId: book.id,
    bookTitle: book.title,
    readerId,
    borrowedAt: Date.now(),
    readingProgress: 0,
    status: 'reading',
  };
  borrowRecords.unshift(record);

  res.json({ book, record });
});

// Return a book
app.post('/api/books/:id/return', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.status !== 'borrowed') {
    return res.status(400).json({ error: '图书未被借出' });
  }

  book.status = 'available';
  const returnedReader = book.borrowedBy;
  book.borrowedBy = undefined;
  book.borrowedAt = undefined;

  const record = borrowRecords.find(
    (r) => r.bookId === book.id && r.readerId === returnedReader && !r.returnedAt
  );
  if (record) {
    record.returnedAt = Date.now();
    record.status = 'completed';
    record.readingProgress = 100;
  }

  const notifiedReaders: string[] = [];
  if (book.queue.length > 0) {
    const nextReader = book.queue.shift()!;
    notifications.push({
      id: uuidv4(),
      readerId: nextReader,
      message: `《${book.title}》已归还，您现在可以借阅了！`,
      createdAt: Date.now(),
    });
    notifiedReaders.push(nextReader);
  }

  res.json({ book, notifiedReaders });
});

// Reserve a book
app.post('/api/books/:id/reserve', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  const readerId = CURRENT_READER_ID;
  if (book.queue.includes(readerId)) {
    return res.status(400).json({ error: '您已在预约队列中' });
  }

  book.queue.push(readerId);
  res.json({ book, position: book.queue.length });
});

// Get borrow records for current reader
app.get('/api/records', (_req: Request, res: Response) => {
  const readerId = CURRENT_READER_ID;
  const readerRecords = borrowRecords.filter((r) => r.readerId === readerId);
  res.json(readerRecords);
});

// Update reading progress
app.patch('/api/records/:id/progress', (req: Request, res: Response) => {
  const { progress } = req.body;
  if (progress === undefined || progress < 0 || progress > 100) {
    return res.status(400).json({ error: '进度值必须在0-100之间' });
  }

  const record = borrowRecords.find((r) => r.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: '借阅记录不存在' });
  }

  record.readingProgress = progress;
  if (progress === 100 && record.returnedAt) {
    record.status = 'completed';
  }

  res.json(record);
});

// Get notifications for current reader
app.get('/api/notifications', (_req: Request, res: Response) => {
  const readerId = CURRENT_READER_ID;
  const readerNotifications = notifications
    .filter((n) => n.readerId === readerId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(readerNotifications);
});

// Get current reader info
app.get('/api/reader', (_req: Request, res: Response) => {
  res.json({ id: CURRENT_READER_ID, name: CURRENT_READER_NAME });
});

app.listen(PORT, () => {
  console.log(`Library server running at http://localhost:${PORT}`);
});
