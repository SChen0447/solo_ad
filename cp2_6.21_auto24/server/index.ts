import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const dataDir = path.join(__dirname, '..', 'src', 'data');

function readBooks() {
  const raw = fs.readFileSync(path.join(dataDir, 'books.json'), 'utf-8');
  return JSON.parse(raw);
}

function writeBooks(books: any[]) {
  fs.writeFileSync(path.join(dataDir, 'books.json'), JSON.stringify(books, null, 2), 'utf-8');
}

function readUsers() {
  const raw = fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8');
  return JSON.parse(raw);
}

function writeUsers(users: any[]) {
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2), 'utf-8');
}

app.get('/api/books', (_req, res) => {
  const books = readBooks();
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const books = readBooks();
  const book = books.find((b: any) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const users = readUsers();
  const notesForBook = users.flatMap((u: any) =>
    (u.notes || []).filter((n: any) => n.bookId === book.id).map((n: any) => ({ ...n, userName: u.name, userId: u.id, userAvatar: u.avatar }))
  );
  res.json({ ...book, notes: notesForBook });
});

app.post('/api/books/:id/borrow', (req, res) => {
  const { userId, dueDate } = req.body;
  const books = readBooks();
  const book = books.find((b: any) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.status !== 'available') return res.status(400).json({ error: 'Book not available' });
  book.status = 'borrowed';
  book.lastBorrowed = new Date().toISOString().slice(0, 10);
  writeBooks(books);
  const users = readUsers();
  const user = users.find((u: any) => u.id === userId);
  if (user) {
    user.borrowedBooks.push({ bookId: book.id, borrowDate: new Date().toISOString().slice(0, 10), dueDate });
    writeUsers(users);
  }
  res.json({ success: true, book });
});

app.post('/api/books/:id/return', (req, res) => {
  const { userId } = req.body;
  const books = readBooks();
  const book = books.find((b: any) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  book.status = 'available';
  writeBooks(books);
  const users = readUsers();
  const user = users.find((u: any) => u.id === userId);
  if (user) {
    user.borrowedBooks = user.borrowedBooks.filter((b: any) => b.bookId !== book.id);
    writeUsers(users);
  }
  res.json({ success: true, book });
});

app.get('/api/notes', (_req, res) => {
  const users = readUsers();
  const allNotes = users.flatMap((u: any) =>
    (u.notes || []).map((n: any) => ({
      ...n,
      userName: u.name,
      userId: u.id,
      userAvatar: u.avatar,
    }))
  );
  allNotes.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const books = readBooks();
  const notesWithBook = allNotes.map((n: any) => {
    const book = books.find((b: any) => b.id === n.bookId);
    return { ...n, bookTitle: book?.title || '', bookCover: book?.coverUrl || '' };
  });
  res.json(notesWithBook);
});

app.post('/api/notes', (req, res) => {
  const { userId, bookId, rating, content } = req.body;
  const users = readUsers();
  const user = users.find((u: any) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newNote = { id: 'n' + uuidv4().slice(0, 6), bookId, rating, content, date: new Date().toISOString().slice(0, 10), comments: [] };
  user.notes = user.notes || [];
  user.notes.push(newNote);
  writeUsers(users);
  res.json({ success: true, note: newNote });
});

app.post('/api/notes/:id/comments', (req, res) => {
  const { userId, content } = req.body;
  const users = readUsers();
  let found = false;
  for (const u of users) {
    const note = (u.notes || []).find((n: any) => n.id === req.params.id);
    if (note) {
      note.comments.push({ userId, content, date: new Date().toISOString().slice(0, 10) });
      found = true;
      break;
    }
  }
  if (!found) return res.status(404).json({ error: 'Note not found' });
  writeUsers(users);
  res.json({ success: true });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  if (!q) return res.json([]);
  const books = readBooks();
  const results = books.filter((b: any) =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    b.category.toLowerCase().includes(q)
  ).slice(0, 8);
  res.json(results);
});

app.get('/api/users/:id', (req, res) => {
  const users = readUsers();
  const user = users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const books = readBooks();
  const borrowedWithBook = (user.borrowedBooks || []).map((b: any) => {
    const book = books.find((bk: any) => bk.id === b.bookId);
    return { ...b, title: book?.title || '', coverUrl: book?.coverUrl || '', author: book?.author || '' };
  });
  const notesWithBook = (user.notes || []).map((n: any) => {
    const book = books.find((bk: any) => bk.id === n.bookId);
    return { ...n, bookTitle: book?.title || '', bookCover: book?.coverUrl || '' };
  });
  res.json({ ...user, borrowedBooks: borrowedWithBook, notes: notesWithBook });
});

app.get('/api/recommendations/:userId', (req, res) => {
  const users = readUsers();
  const user = users.find((u: any) => u.id === req.params.userId);
  const books = readBooks();
  const borrowedBookIds = user ? (user.borrowedBooks || []).map((b: any) => b.bookId) : [];
  const borrowedBooks = books.filter((b: any) => borrowedBookIds.includes(b.id));
  const categories = [...new Set(borrowedBooks.map((b: any) => b.category))];
  const alsoNoteCategories = user
    ? [...new Set((user.notes || []).map((n: any) => {
        const book = books.find((b: any) => b.id === n.bookId);
        return book?.category;
      }).filter(Boolean))]
    : [];
  const allPreferred = [...new Set([...categories, ...alsoNoteCategories])];
  const recommended = allPreferred.length > 0
    ? books.filter((b: any) => allPreferred.includes(b.category) && !borrowedBookIds.includes(b.id))
    : books.filter((b: any) => b.status === 'available');
  res.json(recommended.slice(0, 8));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
