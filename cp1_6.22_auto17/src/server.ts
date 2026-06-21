import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'booktracker.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS moods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    happinessScore INTEGER NOT NULL CHECK (happinessScore >= 1 AND happinessScore <= 10)
  );

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    coverUrl TEXT,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    totalPages INTEGER DEFAULT 0,
    readPages INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    bookId TEXT NOT NULL,
    title TEXT NOT NULL,
    pageCount INTEGER NOT NULL DEFAULT 0,
    moodId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    orderIndex INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (moodId) REFERENCES moods(id)
  );

  CREATE INDEX IF NOT EXISTS idx_chapters_bookId ON chapters(bookId);
  CREATE INDEX IF NOT EXISTS idx_books_userId ON books(userId);
`);

const defaultMoods = [
  { id: 'mood_1', name: '震撼', color: '#ff7043', happinessScore: 10 },
  { id: 'mood_2', name: '感动', color: '#f48fb1', happinessScore: 9 },
  { id: 'mood_3', name: '兴奋', color: '#ffb74d', happinessScore: 9 },
  { id: 'mood_4', name: '温暖', color: '#ffcc80', happinessScore: 8 },
  { id: 'mood_5', name: '期待', color: '#ce93d8', happinessScore: 8 },
  { id: 'mood_6', name: '思考', color: '#7986cb', happinessScore: 7 },
  { id: 'mood_7', name: '平静', color: '#81c784', happinessScore: 6 },
  { id: 'mood_8', name: '好奇', color: '#4dd0e1', happinessScore: 6 },
  { id: 'mood_9', name: '困惑', color: '#9575cd', happinessScore: 4 },
  { id: 'mood_10', name: '无聊', color: '#a1887f', happinessScore: 2 },
  { id: 'mood_11', name: '失望', color: '#90a4ae', happinessScore: 3 },
  { id: 'mood_12', name: '沉重', color: '#757575', happinessScore: 2 }
];

const insertMoodStmt = db.prepare(`
  INSERT OR IGNORE INTO moods (id, name, color, happinessScore)
  VALUES (@id, @name, @color, @happinessScore)
`);

const insertManyMoods = db.transaction((moods: typeof defaultMoods) => {
  for (const mood of moods) {
    insertMoodStmt.run(mood);
  }
});
insertManyMoods(defaultMoods);

const demoUserId = 'user_demo_001';

app.get('/api/moods', (_req, res) => {
  const moods = db.prepare('SELECT * FROM moods ORDER BY happinessScore DESC').all();
  res.json(moods);
});

app.get('/api/books', (_req, res) => {
  const books = db.prepare(`
    SELECT b.*, 
           COALESCE(SUM(c.pageCount), 0) as readPages,
           (SELECT COUNT(*) FROM chapters WHERE bookId = b.id) as chapterCount
    FROM books b
    LEFT JOIN chapters c ON b.id = c.bookId
    WHERE b.userId = ?
    GROUP BY b.id
    ORDER BY b.createdAt DESC
  `).all(demoUserId);
  
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND userId = ?').get(req.params.id, demoUserId);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  const chapters = db.prepare(`
    SELECT c.*, m.name as moodName, m.color as moodColor, m.happinessScore as moodScore
    FROM chapters c
    LEFT JOIN moods m ON c.moodId = m.id
    WHERE c.bookId = ?
    ORDER BY c.orderIndex ASC, c.createdAt ASC
  `).all(req.params.id);
  
  const chaptersWithMood = chapters.map((ch: any) => ({
    id: ch.id,
    bookId: ch.bookId,
    title: ch.title,
    pageCount: ch.pageCount,
    moodId: ch.moodId,
    createdAt: ch.createdAt,
    orderIndex: ch.orderIndex,
    mood: {
      id: ch.moodId,
      name: ch.moodName,
      color: ch.moodColor,
      happinessScore: ch.moodScore
    }
  }));
  
  const totalReadPages = chapters.reduce((sum: number, ch: any) => sum + ch.pageCount, 0);
  
  res.json({
    ...book,
    readPages: totalReadPages,
    chapters: chaptersWithMood
  });
});

app.post('/api/books', (req, res) => {
  const { title, author, coverUrl, totalPages } = req.body;
  
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }
  
  const bookId = uuidv4();
  const createdAt = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO books (id, title, author, coverUrl, userId, createdAt, totalPages, readPages)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(bookId, title, author, coverUrl || '', demoUserId, createdAt, totalPages || 0);
  
  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  res.status(201).json(newBook);
});

app.delete('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND userId = ?').get(req.params.id, demoUserId);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM chapters WHERE bookId = ?').run(req.params.id);
    db.prepare('DELETE FROM books WHERE id = ? AND userId = ?').run(req.params.id, demoUserId);
  });
  
  tx();
  res.status(204).send();
});

app.post('/api/books/:id/chapters', (req, res) => {
  const { title, pageCount, moodId } = req.body;
  
  if (!title || !moodId) {
    return res.status(400).json({ error: 'Title and moodId are required' });
  }
  
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND userId = ?').get(req.params.id, demoUserId);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  const mood = db.prepare('SELECT * FROM moods WHERE id = ?').get(moodId);
  
  if (!mood) {
    return res.status(400).json({ error: 'Invalid moodId' });
  }
  
  const chapterId = uuidv4();
  const createdAt = new Date().toISOString();
  
  const maxOrderIndex = db.prepare(`
    SELECT COALESCE(MAX(orderIndex), -1) as maxIndex FROM chapters WHERE bookId = ?
  `).get(req.params.id) as { maxIndex: number };
  
  const orderIndex = maxOrderIndex.maxIndex + 1;
  
  db.prepare(`
    INSERT INTO chapters (id, bookId, title, pageCount, moodId, createdAt, orderIndex)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(chapterId, req.params.id, title, pageCount || 0, moodId, createdAt, orderIndex);
  
  const newChapter = db.prepare(`
    SELECT c.*, m.name as moodName, m.color as moodColor, m.happinessScore as moodScore
    FROM chapters c
    LEFT JOIN moods m ON c.moodId = m.id
    WHERE c.id = ?
  `).get(chapterId) as any;
  
  const chapterWithMood = {
    id: newChapter.id,
    bookId: newChapter.bookId,
    title: newChapter.title,
    pageCount: newChapter.pageCount,
    moodId: newChapter.moodId,
    createdAt: newChapter.createdAt,
    orderIndex: newChapter.orderIndex,
    mood: {
      id: newChapter.moodId,
      name: newChapter.moodName,
      color: newChapter.moodColor,
      happinessScore: newChapter.moodScore
    }
  };
  
  res.status(201).json(chapterWithMood);
});

app.delete('/api/books/:bookId/chapters/:chapterId', (req, res) => {
  const { bookId, chapterId } = req.params;
  
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND userId = ?').get(bookId, demoUserId);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND bookId = ?').get(chapterId, bookId);
  
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }
  
  db.prepare('DELETE FROM chapters WHERE id = ? AND bookId = ?').run(chapterId, bookId);
  res.status(204).send();
});

app.get('/api/books/:id/emotion-curve', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND userId = ?').get(req.params.id, demoUserId);
  
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  
  const chapters = db.prepare(`
    SELECT c.orderIndex, c.title as chapterTitle, m.name as moodName, 
           m.happinessScore as happinessScore, m.color as color
    FROM chapters c
    LEFT JOIN moods m ON c.moodId = m.id
    WHERE c.bookId = ?
    ORDER BY c.orderIndex ASC, c.createdAt ASC
  `).all(req.params.id);
  
  const emotionData = chapters.map((ch: any, index: number) => ({
    chapterOrder: index + 1,
    chapterTitle: ch.chapterTitle,
    moodName: ch.moodName,
    happinessScore: ch.happinessScore,
    color: ch.color
  }));
  
  res.json(emotionData);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
