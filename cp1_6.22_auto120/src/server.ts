import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Book, BookList, ReadingChallenge, DailyReading, ReadingStatus } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

let books: Book[] = [];
let bookLists: BookList[] = [];
let challenges: ReadingChallenge[] = [];
let dailyReadings: DailyReading[] = [];

const seedData = () => {
  const statuses: ReadingStatus[] = ['unread', 'reading', 'read'];
  const defaultCovers = [
    'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=book%20cover%20classic%20novel%20elegant%20design&image_size=portrait_4_3',
    'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=book%20cover%20science%20fiction%20futuristic&image_size=portrait_4_3',
    'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=book%20cover%20fantasy%20magic%20adventure&image_size=portrait_4_3',
    'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=book%20cover%20history%20ancient%20civilization&image_size=portrait_4_3',
    'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=book%20cover%20philosophy%20deep%20thinking&image_size=portrait_4_3',
  ];
  const bookNames = [
    '百年孤独', '三体', '活着', '红楼梦', '围城',
    '平凡的世界', '追风筝的人', '小王子', '人类简史', '原则',
    '思考，快与慢', '万历十五年', '月亮与六便士', '1984', '动物农场',
    '挪威的森林', '白夜行', '解忧杂货店', '飘', '傲慢与偏见',
  ];
  const authors = [
    '加西亚·马尔克斯', '刘慈欣', '余华', '曹雪芹', '钱钟书',
    '路遥', '卡勒德·胡赛尼', '圣-埃克苏佩里', '尤瓦尔·赫拉利', '瑞·达利欧',
    '丹尼尔·卡尼曼', '黄仁宇', '毛姆', '乔治·奥威尔', '乔治·奥威尔',
    '村上春树', '东野圭吾', '东野圭吾', '玛格丽特·米切尔', '简·奥斯汀',
  ];

  for (let i = 0; i < 20; i++) {
    books.push({
      id: uuidv4(),
      title: bookNames[i],
      author: authors[i],
      isbn: `978-${String(7).repeat(3)}-${String(10000 + i).padStart(5, '0')}`,
      coverUrl: defaultCovers[i % defaultCovers.length],
      status: statuses[i % 3],
      bookLists: [],
      addedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    });
  }

  const listNames = ['2025必读清单', '经典文学', '科幻探索'];
  listNames.forEach((name, i) => {
    bookLists.push({
      id: uuidv4(),
      name,
      coverUrl: defaultCovers[i],
      bookIds: books.slice(i * 4, i * 4 + 4).map((b) => b.id),
      createdAt: new Date(Date.now() - i * 86400000 * 7).toISOString(),
    });
  });

  books.slice(0, 4).forEach((b) => { b.bookLists = [bookLists[0].id]; });
  books.slice(4, 8).forEach((b) => { b.bookLists = [bookLists[1].id]; });
  books.slice(8, 12).forEach((b) => { b.bookLists = [bookLists[2].id]; });

  challenges.push({
    id: uuidv4(),
    name: '2025年度阅读挑战',
    monthlyGoal: 4,
    totalMinutesGoal: 12000,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  });

  const challengeId = challenges[0].id;
  const today = new Date();
  for (let d = 90; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    if (Math.random() > 0.3) {
      dailyReadings.push({
        date: dateStr,
        minutes: Math.floor(Math.random() * 90) + 15,
        challengeId,
      });
    }
  }
};

seedData();

app.get('/api/books', (_req, res) => {
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, isbn, coverUrl } = req.body;
  if (!title || !author) return res.status(400).json({ error: 'Title and author are required' });
  const book: Book = {
    id: uuidv4(),
    title,
    author,
    isbn: isbn || '',
    coverUrl: coverUrl || '',
    status: 'unread',
    bookLists: [],
    addedAt: new Date().toISOString(),
  };
  books.push(book);
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const idx = books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book not found' });
  books[idx] = { ...books[idx], ...req.body, id: books[idx].id };
  res.json(books[idx]);
});

app.delete('/api/books/:id', (req, res) => {
  const idx = books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book not found' });
  books.splice(idx, 1);
  bookLists.forEach((bl) => {
    bl.bookIds = bl.bookIds.filter((id) => id !== req.params.id);
  });
  res.status(204).end();
});

app.get('/api/books/search', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  if (!q) return res.json([]);
  const results = books.filter(
    (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q)
  ).slice(0, 10);
  res.json(results);
});

app.get('/api/booklists', (_req, res) => {
  res.json(bookLists);
});

app.get('/api/booklists/:id', (req, res) => {
  const bl = bookLists.find((l) => l.id === req.params.id);
  if (!bl) return res.status(404).json({ error: 'Book list not found' });
  res.json(bl);
});

app.post('/api/booklists', (req, res) => {
  const { name, coverUrl } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (name.length > 20) return res.status(400).json({ error: 'Name must be 20 characters or less' });
  const bl: BookList = {
    id: uuidv4(),
    name,
    coverUrl: coverUrl || '',
    bookIds: [],
    createdAt: new Date().toISOString(),
  };
  bookLists.push(bl);
  res.status(201).json(bl);
});

app.put('/api/booklists/:id', (req, res) => {
  const idx = bookLists.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book list not found' });
  const { name, coverUrl, bookIds } = req.body;
  if (name && name.length > 20) return res.status(400).json({ error: 'Name must be 20 characters or less' });
  bookLists[idx] = { ...bookLists[idx], ...(name && { name }), ...(coverUrl !== undefined && { coverUrl }), ...(bookIds && { bookIds }) };
  res.json(bookLists[idx]);
});

app.delete('/api/booklists/:id', (req, res) => {
  const idx = bookLists.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book list not found' });
  const listId = req.params.id;
  bookLists.splice(idx, 1);
  books.forEach((b) => {
    b.bookLists = b.bookLists.filter((id) => id !== listId);
  });
  res.status(204).end();
});

app.post('/api/booklists/:id/reorder', (req, res) => {
  const idx = bookLists.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book list not found' });
  const { bookIds } = req.body;
  if (!Array.isArray(bookIds)) return res.status(400).json({ error: 'bookIds must be an array' });
  bookLists[idx].bookIds = bookIds;
  res.json(bookLists[idx]);
});

app.get('/api/challenges', (_req, res) => {
  res.json(challenges);
});

app.post('/api/challenges', (req, res) => {
  const { name, monthlyGoal, totalMinutesGoal, startDate, endDate } = req.body;
  if (!name || !monthlyGoal) return res.status(400).json({ error: 'Name and monthly goal are required' });
  const challenge: ReadingChallenge = {
    id: uuidv4(),
    name,
    monthlyGoal,
    totalMinutesGoal: totalMinutesGoal || 0,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || '',
  };
  challenges.push(challenge);
  res.status(201).json(challenge);
});

app.put('/api/challenges/:id', (req, res) => {
  const idx = challenges.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Challenge not found' });
  challenges[idx] = { ...challenges[idx], ...req.body, id: challenges[idx].id };
  res.json(challenges[idx]);
});

app.delete('/api/challenges/:id', (req, res) => {
  const idx = challenges.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Challenge not found' });
  challenges.splice(idx, 1);
  dailyReadings = dailyReadings.filter((d) => d.challengeId !== req.params.id);
  res.status(204).end();
});

app.get('/api/challenges/:id/progress', (req, res) => {
  const challenge = challenges.find((c) => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const readings = dailyReadings.filter((d) => d.challengeId === challenge.id);
  const totalMinutesRead = readings.reduce((sum, d) => sum + d.minutes, 0);
  const now = new Date();
  const start = new Date(challenge.startDate);
  const monthsElapsed = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  const readBooksCount = books.filter((b) => b.status === 'read' && new Date(b.addedAt) >= start).length;
  const monthlyProgress = Math.min(100, (readBooksCount / (challenge.monthlyGoal * monthsElapsed)) * 100);
  const totalMinutesProgress = challenge.totalMinutesGoal > 0 ? Math.min(100, (totalMinutesRead / challenge.totalMinutesGoal) * 100) : 0;

  res.json({
    challenge,
    booksCompleted: readBooksCount,
    totalMinutesRead,
    monthlyProgress,
    totalMinutesProgress,
    dailyReadings: readings,
  });
});

app.get('/api/challenges/:id/daily', (req, res) => {
  const challengeId = req.params.id;
  const readings = dailyReadings.filter((d) => d.challengeId === challengeId);
  res.json(readings);
});

app.post('/api/challenges/:id/daily', (req, res) => {
  const { date, minutes } = req.body;
  if (!date || minutes === undefined) return res.status(400).json({ error: 'Date and minutes are required' });
  const challengeId = req.params.id;
  const existing = dailyReadings.findIndex((d) => d.challengeId === challengeId && d.date === date);
  if (existing !== -1) {
    dailyReadings[existing].minutes = minutes;
    res.json(dailyReadings[existing]);
  } else {
    const reading: DailyReading = { date, minutes, challengeId };
    dailyReadings.push(reading);
    res.status(201).json(reading);
  }
});

app.get('/api/stats', (_req, res) => {
  const total = books.length;
  const unread = books.filter((b) => b.status === 'unread').length;
  const reading = books.filter((b) => b.status === 'reading').length;
  const read = books.filter((b) => b.status === 'read').length;
  const totalMinutes = dailyReadings.reduce((sum, d) => sum + d.minutes, 0);

  const now = new Date();
  const monthlyMinutes: { month: string; minutes: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mins = dailyReadings
      .filter((r) => r.date.startsWith(monthStr))
      .reduce((sum, r) => sum + r.minutes, 0);
    monthlyMinutes.push({ month: monthStr, minutes: mins });
  }

  res.json({ total, unread, reading, read, totalMinutes, monthlyMinutes });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
