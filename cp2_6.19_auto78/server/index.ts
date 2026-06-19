import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  status: 'available' | 'borrowed';
  borrower?: string;
  borrowDate?: string;
  reserveQueue: string[];
}

interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  readerName: string;
  borrowDate: string;
  returnDate?: string;
  status: 'reading' | 'completed';
  progress: number;
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const categories = ['文学', '科技', '历史', '艺术', '哲学', '经济'];

const books: Book[] = [
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    isbn: '9787544212345',
    category: '文学',
    coverUrl: 'https://picsum.photos/seed/book1/200/280',
    status: 'available',
    reserveQueue: [],
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    isbn: '9787508647357',
    category: '历史',
    coverUrl: 'https://picsum.photos/seed/book2/200/280',
    status: 'borrowed',
    borrower: '张三',
    borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    reserveQueue: ['李四', '王五'],
  },
  {
    id: uuidv4(),
    title: '算法导论',
    author: 'Thomas H. Cormen',
    isbn: '9787111407010',
    category: '科技',
    coverUrl: 'https://picsum.photos/seed/book3/200/280',
    status: 'available',
    reserveQueue: [],
  },
  {
    id: uuidv4(),
    title: '艺术的故事',
    author: '贡布里希',
    isbn: '9787807463726',
    category: '艺术',
    coverUrl: 'https://picsum.photos/seed/book4/200/280',
    status: 'borrowed',
    borrower: '张三',
    borrowDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reserveQueue: [],
  },
  {
    id: uuidv4(),
    title: '存在与时间',
    author: '马丁·海德格尔',
    isbn: '9787108017864',
    category: '哲学',
    coverUrl: 'https://picsum.photos/seed/book5/200/280',
    status: 'available',
    reserveQueue: [],
  },
  {
    id: uuidv4(),
    title: '国富论',
    author: '亚当·斯密',
    isbn: '9787100011525',
    category: '经济',
    coverUrl: 'https://picsum.photos/seed/book6/200/280',
    status: 'available',
    reserveQueue: [],
  },
];

const borrowRecords: BorrowRecord[] = [
  {
    id: uuidv4(),
    bookId: books[1].id,
    bookTitle: '人类简史',
    bookCover: books[1].coverUrl,
    readerName: '张三',
    borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'reading',
    progress: 65,
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    bookTitle: '人类简史',
    bookCover: books[1].coverUrl,
    readerName: '李四',
    borrowDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    progress: 100,
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    bookTitle: '人类简史',
    bookCover: books[1].coverUrl,
    readerName: '王五',
    borrowDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    progress: 100,
  },
  {
    id: uuidv4(),
    bookId: books[0].id,
    bookTitle: '百年孤独',
    bookCover: books[0].coverUrl,
    readerName: '赵六',
    borrowDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    progress: 100,
  },
  {
    id: uuidv4(),
    bookId: books[0].id,
    bookTitle: '百年孤独',
    bookCover: books[0].coverUrl,
    readerName: '钱七',
    borrowDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    progress: 100,
  },
  {
    id: uuidv4(),
    bookId: books[3].id,
    bookTitle: '艺术的故事',
    bookCover: books[3].coverUrl,
    readerName: '张三',
    borrowDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'reading',
    progress: 30,
  },
  {
    id: uuidv4(),
    bookId: books[2].id,
    bookTitle: '算法导论',
    bookCover: books[2].coverUrl,
    readerName: '孙八',
    borrowDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    progress: 100,
  },
];

const currentReader = '张三';

app.get('/api/books', (req: Request, res: Response) => {
  const { search = '', category = '' } = req.query;
  let filtered = [...books];

  if (search) {
    const searchStr = String(search).toLowerCase();
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(searchStr) ||
        book.author.toLowerCase().includes(searchStr)
    );
  }

  if (category && category !== 'all') {
    filtered = filtered.filter((book) => book.category === category);
  }

  res.json(filtered);
});

app.get('/api/books/:id', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  res.json(book);
});

app.post('/api/books', (req: Request, res: Response) => {
  const { title, author, isbn, category, coverUrl } = req.body;

  if (!title || !author || !isbn || !category) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    isbn,
    category,
    coverUrl: coverUrl || `https://picsum.photos/seed/${uuidv4()}/200/280`,
    status: 'available',
    reserveQueue: [],
  };

  books.unshift(newBook);
  res.status(201).json(newBook);
});

app.post('/api/books/:id/borrow', (req: Request, res: Response) => {
  const { readerName } = req.body;
  const book = books.find((b) => b.id === req.params.id);

  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.status === 'borrowed') {
    return res.status(400).json({ error: '图书已被借出' });
  }

  book.status = 'borrowed';
  book.borrower = readerName;
  book.borrowDate = new Date().toISOString();

  const record: BorrowRecord = {
    id: uuidv4(),
    bookId: book.id,
    bookTitle: book.title,
    bookCover: book.coverUrl,
    readerName,
    borrowDate: book.borrowDate,
    status: 'reading',
    progress: 0,
  };
  borrowRecords.unshift(record);

  res.json({ book, record });
});

app.post('/api/books/:id/return', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);

  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.status === 'available') {
    return res.status(400).json({ error: '图书未被借出' });
  }

  const record = borrowRecords.find(
    (r) => r.bookId === book.id && r.status === 'reading' && r.readerName === book.borrower
  );
  if (record) {
    record.returnDate = new Date().toISOString();
    record.status = 'completed';
    if (record.progress < 100) {
      record.progress = 100;
    }
  }

  const reserveQueue = [...book.reserveQueue];
  const nextBorrower = book.reserveQueue.shift();

  book.status = 'available';
  book.borrower = undefined;
  book.borrowDate = undefined;

  res.json({
    book,
    nextBorrower,
    notifiedReader: nextBorrower || null,
    reserveQueue,
  });
});

app.post('/api/books/:id/reserve', (req: Request, res: Response) => {
  const { readerName } = req.body;
  const book = books.find((b) => b.id === req.params.id);

  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.status === 'available') {
    return res.status(400).json({ error: '图书可借，无需预约' });
  }

  if (book.reserveQueue.includes(readerName)) {
    return res.status(400).json({ error: '您已在预约队列中' });
  }

  if (book.borrower === readerName) {
    return res.status(400).json({ error: '您是当前借阅者，无需预约' });
  }

  book.reserveQueue.push(readerName);
  res.json({ book, position: book.reserveQueue.length });
});

app.delete('/api/books/:id/reserve', (req: Request, res: Response) => {
  const { readerName } = req.query;
  const book = books.find((b) => b.id === req.params.id);

  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  book.reserveQueue = book.reserveQueue.filter((r) => r !== readerName);
  res.json(book);
});

app.get('/api/records', (req: Request, res: Response) => {
  const { readerName } = req.query;
  let filtered = [...borrowRecords];

  if (readerName) {
    filtered = filtered.filter((r) => r.readerName === readerName);
  }

  res.json(filtered);
});

app.put('/api/records/:id/progress', (req: Request, res: Response) => {
  const { progress } = req.body;
  const record = borrowRecords.find((r) => r.id === req.params.id);

  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }

  record.progress = Math.max(0, Math.min(100, progress));
  if (record.progress >= 100) {
    record.progress = 100;
  }

  res.json(record);
});

app.get('/api/books/:id/records', (req: Request, res: Response) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  const records = borrowRecords
    .filter((r) => r.bookId === req.params.id)
    .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      readerName: r.readerName,
      borrowDate: r.borrowDate,
      returnDate: r.returnDate,
      status: r.status,
    }));

  res.json(records);
});

app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(categories);
});

app.get('/api/reader', (_req: Request, res: Response) => {
  res.json({ name: currentReader });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
