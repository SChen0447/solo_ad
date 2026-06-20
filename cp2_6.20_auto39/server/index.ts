import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  getBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  getUsers,
  getUserById,
  login,
  register,
  getBookClubs,
  getBookClubById,
  addBookClub,
  joinBookClub,
  approveMember,
  getNotesByClubId,
  addNote,
  getAchievements,
  getUserAchievements,
  getReadingProgress,
  getCategories,
  getBooksByCategory
} from './data';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/books', (req: Request, res: Response) => {
  const { category } = req.query;
  if (category && category !== 'all') {
    const books = getBooksByCategory(category as string);
    res.json(books);
  } else {
    const books = getBooks();
    res.json(books);
  }
});

app.get('/api/books/categories', (req: Request, res: Response) => {
  const categories = getCategories();
  res.json(categories);
});

app.get('/api/books/:id', (req: Request, res: Response) => {
  const book = getBookById(req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json(book);
});

app.post('/api/books', (req: Request, res: Response) => {
  const { title, author, isbn, category, stock, coverUrl } = req.body;
  if (!title || !author || !category) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newBook = addBook({
    title,
    author,
    isbn: isbn || '',
    category,
    stock: stock || 0,
    coverUrl: coverUrl || `https://picsum.photos/seed/${Date.now()}/220/300`
  });
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req: Request, res: Response) => {
  const updated = updateBook(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json(updated);
});

app.delete('/api/books/:id', (req: Request, res: Response) => {
  const deleted = deleteBook(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = login(username, password);
  if (!result) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json(result);
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const result = register(username, password);
  if (!result) {
    res.status(400).json({ error: 'Username already exists' });
    return;
  }
  res.status(201).json(result);
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = getUsers();
  res.json(users);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

app.get('/api/users/:id/achievements', (req: Request, res: Response) => {
  const achievements = getUserAchievements(req.params.id);
  res.json(achievements);
});

app.get('/api/users/:id/reading-progress', (req: Request, res: Response) => {
  const progress = getReadingProgress(req.params.id);
  res.json(progress);
});

app.get('/api/clubs', (req: Request, res: Response) => {
  const clubs = getBookClubs();
  res.json(clubs);
});

app.get('/api/clubs/:id', (req: Request, res: Response) => {
  const club = getBookClubById(req.params.id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }
  res.json(club);
});

app.post('/api/clubs', (req: Request, res: Response) => {
  const { name, bookTitle, coverUrl, startTime, endTime, description, maxMembers, creatorId } = req.body;
  if (!name || !bookTitle || !startTime || !endTime || !creatorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newClub = addBookClub({
    name,
    bookTitle,
    coverUrl: coverUrl || `https://picsum.photos/seed/${Date.now()}/200/200`,
    startTime,
    endTime,
    description: description || '',
    maxMembers: maxMembers || 20,
    creatorId
  });
  res.status(201).json(newClub);
});

app.post('/api/clubs/:id/join', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'UserId is required' });
    return;
  }
  const success = joinBookClub(req.params.id, userId);
  if (!success) {
    res.status(400).json({ error: 'Failed to join club' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/clubs/:id/approve', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'UserId is required' });
    return;
  }
  const success = approveMember(req.params.id, userId);
  if (!success) {
    res.status(400).json({ error: 'Failed to approve member' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/clubs/:clubId/notes', (req: Request, res: Response) => {
  const notes = getNotesByClubId(req.params.clubId);
  res.json(notes);
});

app.post('/api/clubs/:clubId/notes', (req: Request, res: Response) => {
  const { userId, title, content, progress } = req.body;
  if (!userId || !title || !content) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newNote = addNote({
    clubId: req.params.clubId,
    userId,
    title,
    content,
    progress: progress || 0
  });
  res.status(201).json(newNote);
});

app.get('/api/achievements', (req: Request, res: Response) => {
  const achievements = getAchievements();
  res.json(achievements);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
