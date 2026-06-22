import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

let books = [];
let sessions = [];

const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      books = data.books || [];
      sessions = data.sessions || [];
      console.log('数据加载成功');
    }
  } catch (err) {
    console.error('加载数据失败:', err);
  }
};

const saveData = () => {
  try {
    const data = { books, sessions };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('保存数据失败:', err);
  }
};

loadData();

const getBookStatus = (book) => {
  if (book.readPages >= book.totalPages) return 'completed';
  if (book.readPages > 0) return 'reading';
  return 'unread';
};

const updateBookAfterSession = (bookId, pagesRead, duration) => {
  const index = books.findIndex(b => b.id === bookId);
  if (index === -1) return null;
  const book = books[index];
  const newReadPages = Math.min(book.readPages + pagesRead, book.totalPages);
  books[index] = {
    ...book,
    readPages: newReadPages,
    totalReadingTime: book.totalReadingTime + duration,
    status: getBookStatus({ ...book, readPages: newReadPages }),
  };
  saveData();
  return books[index];
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '阅读记录器 API 服务运行中' });
});

app.get('/api/books', (req, res) => {
  const { tags, status } = req.query;
  let result = [...books];

  if (status && status !== 'all') {
    result = result.filter(b => b.status === status);
  }

  if (tags) {
    const tagList = String(tags).split(',').filter(Boolean);
    if (tagList.length > 0) {
      result = result.filter(b => tagList.some(t => b.tags.includes(t)));
    }
  }

  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, totalPages, tags = [] } = req.body;

  if (!title || !author || !totalPages) {
    return res.status(400).json({ error: '书名、作者和总页数为必填项' });
  }

  const newBook = {
    id: uuidv4(),
    title: String(title).trim(),
    author: String(author).trim(),
    totalPages: parseInt(totalPages),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
    readPages: 0,
    totalReadingTime: 0,
    status: 'unread',
    createdAt: Date.now(),
  };

  books.push(newBook);
  saveData();
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const index = books.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const { title, author, totalPages, tags, readPages } = req.body;
  const updated = { ...books[index] };

  if (title !== undefined) updated.title = String(title).trim();
  if (author !== undefined) updated.author = String(author).trim();
  if (totalPages !== undefined) updated.totalPages = parseInt(totalPages);
  if (tags !== undefined) {
    updated.tags = Array.isArray(tags)
      ? tags.map(t => String(t).trim()).filter(Boolean)
      : [];
  }
  if (readPages !== undefined) {
    updated.readPages = Math.min(parseInt(readPages), updated.totalPages);
  }

  updated.status = getBookStatus(updated);
  books[index] = updated;
  saveData();
  res.json(updated);
});

app.delete('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === req.params.id);
  if (bookIndex === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  books.splice(bookIndex, 1);
  sessions = sessions.filter(s => s.bookId !== req.params.id);
  saveData();

  res.json({ message: '删除成功' });
});

app.get('/api/tags', (req, res) => {
  const tagSet = new Set();
  books.forEach(b => b.tags.forEach(t => tagSet.add(t)));
  res.json(Array.from(tagSet).sort());
});

app.get('/api/sessions', (req, res) => {
  const { bookId } = req.query;
  let result = [...sessions];
  if (bookId) {
    result = result.filter(s => s.bookId === bookId);
  }
  result.sort((a, b) => b.startTime - a.startTime);
  res.json(result);
});

app.post('/api/sessions', (req, res) => {
  const { bookId, startTime, endTime, pagesRead } = req.body;

  if (!bookId || !startTime || !endTime || pagesRead === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const start = parseInt(startTime);
  const end = parseInt(endTime);
  const pages = parseInt(pagesRead);

  if (end <= start) {
    return res.status(400).json({ error: '结束时间必须晚于开始时间' });
  }

  const book = books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const duration = Math.floor((end - start) / 1000);
  const date = new Date(start).toISOString().split('T')[0];

  const session = {
    id: uuidv4(),
    bookId,
    startTime: start,
    endTime: end,
    duration,
    pagesRead: pages,
    date,
  };

  sessions.push(session);
  updateBookAfterSession(bookId, pages, duration);
  res.status(201).json(session);
});

app.get('/api/stats', (req, res) => {
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

  res.json({
    weeklyReadingTime,
    monthlyPagesRead,
    currentlyReadingCount,
    totalBooks: books.length,
    completedBooks: books.filter(b => b.status === 'completed').length,
    totalReadingTime: books.reduce((acc, b) => acc + b.totalReadingTime, 0),
  });
});

app.get('/api/stats/daily', (req, res) => {
  const result = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      duration: 0,
      books: [],
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

  res.json(result);
});

app.post('/api/export', (req, res) => {
  const data = {
    books,
    sessions,
    exportedAt: new Date().toISOString(),
  };
  res.json(data);
});

app.post('/api/import', (req, res) => {
  const { books: importedBooks, sessions: importedSessions } = req.body;

  if (importedBooks && Array.isArray(importedBooks)) {
    books = importedBooks;
  }
  if (importedSessions && Array.isArray(importedSessions)) {
    sessions = importedSessions;
  }

  saveData();

  res.json({
    booksCount: importedBooks?.length || 0,
    sessionsCount: importedSessions?.length || 0,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 阅读记录器 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📁 数据存储位置: ${DATA_FILE}`);
});
