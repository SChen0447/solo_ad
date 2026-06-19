import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb, Book, Circle, Note, Comment } from './data.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get('/api/health', async (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    await delay(50);
    res.json(db.users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/books', async (req: Request, res: Response) => {
  try {
    const { search, category, excludeOffline } = req.query;
    const db = await readDb();
    let books = [...db.books];

    if (excludeOffline === 'true') {
      books = books.filter((b) => b.status !== 'offline');
    }

    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.category.toLowerCase().includes(s) ||
          b.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    if (category && typeof category === 'string' && category !== 'all') {
      books = books.filter((b) => b.category === category);
    }

    await delay(100);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const book = db.books.find((b) => b.id === id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    await delay(50);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

app.post('/api/books', async (req: Request, res: Response) => {
  try {
    const { title, author, category, description, coverUrl, ownerId, tags } = req.body;
    if (!title || !author || !category || !ownerId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const db = await readDb();
    const newBook: Book = {
      id: uuidv4(),
      title,
      author,
      category,
      description: description || '',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
      status: 'available',
      ownerId,
      tags: tags || [],
      createdAt: new Date().toISOString()
    };
    db.books.unshift(newBook);
    await writeDb(db);
    await delay(150);
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.put('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, author, category, description, coverUrl, status, tags } = req.body;
    const db = await readDb();
    const idx = db.books.findIndex((b) => b.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    db.books[idx] = {
      ...db.books[idx],
      ...(title !== undefined && { title }),
      ...(author !== undefined && { author }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(status !== undefined && { status }),
      ...(tags !== undefined && { tags })
    };
    await writeDb(db);
    await delay(100);
    res.json(db.books[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const idx = db.books.findIndex((b) => b.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    db.books.splice(idx, 1);
    await writeDb(db);
    await delay(100);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

app.get('/api/circles', async (req: Request, res: Response) => {
  try {
    const db = await readDb();
    await delay(50);
    res.json(db.circles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

app.get('/api/circles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await readDb();
    const circle = db.circles.find((c) => c.id === id);
    if (!circle) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }
    await delay(50);
    res.json(circle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch circle' });
  }
});

app.post('/api/circles', async (req: Request, res: Response) => {
  try {
    const { name, description, bookIds, maxMembers, ownerId, tags } = req.body;
    if (!name || !ownerId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const db = await readDb();
    const newCircle: Circle = {
      id: uuidv4(),
      name,
      description: description || '',
      bookIds: bookIds || [],
      currentBookId: bookIds && bookIds.length > 0 ? bookIds[0] : null,
      maxMembers: maxMembers || 6,
      ownerId,
      members: [ownerId],
      pendingMembers: [],
      tags: tags || [],
      progress: { [ownerId]: {} },
      totalChapters: 5,
      createdAt: new Date().toISOString()
    };
    db.circles.unshift(newCircle);
    await writeDb(db);
    await delay(150);
    res.status(201).json(newCircle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

app.post('/api/circles/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const db = await readDb();
    const idx = db.circles.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }
    const circle = db.circles[idx];
    if (circle.members.includes(userId)) {
      res.status(400).json({ error: 'Already a member' });
      return;
    }
    if (!circle.pendingMembers.includes(userId)) {
      circle.pendingMembers.push(userId);
      await writeDb(db);
    }
    await delay(100);
    res.json(circle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply to join' });
  }
});

app.post('/api/circles/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, approverId } = req.body;
    if (!userId || !approverId) {
      res.status(400).json({ error: 'userId and approverId are required' });
      return;
    }
    const db = await readDb();
    const idx = db.circles.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }
    const circle = db.circles[idx];
    if (circle.ownerId !== approverId) {
      res.status(403).json({ error: 'Only owner can approve' });
      return;
    }
    const pendingIdx = circle.pendingMembers.indexOf(userId);
    if (pendingIdx === -1) {
      res.status(400).json({ error: 'User not in pending list' });
      return;
    }
    if (circle.members.length >= circle.maxMembers) {
      res.status(400).json({ error: 'Circle is full' });
      return;
    }
    circle.pendingMembers.splice(pendingIdx, 1);
    circle.members.push(userId);
    circle.progress[userId] = {};
    await writeDb(db);
    await delay(100);
    res.json(circle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve member' });
  }
});

app.post('/api/circles/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, chapter, completed } = req.body;
    if (!userId || chapter === undefined || completed === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const db = await readDb();
    const idx = db.circles.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }
    const circle = db.circles[idx];
    if (!circle.progress[userId]) {
      circle.progress[userId] = {};
    }
    circle.progress[userId][String(chapter)] = completed;
    await writeDb(db);
    await delay(80);
    res.json(circle.progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.get('/api/notes', async (req: Request, res: Response) => {
  try {
    const { circleId, bookId } = req.query;
    const db = await readDb();
    let notes = [...db.notes];
    if (circleId && typeof circleId === 'string') {
      notes = notes.filter((n) => n.circleId === circleId);
    }
    if (bookId && typeof bookId === 'string') {
      notes = notes.filter((n) => n.bookId === bookId);
    }
    notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await delay(100);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req: Request, res: Response) => {
  try {
    const { circleId, bookId, userId, content, rating, tags } = req.body;
    if (!circleId || !bookId || !userId || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const db = await readDb();
    const newNote: Note = {
      id: uuidv4(),
      circleId,
      bookId,
      userId,
      content,
      rating: rating || 0,
      tags: tags || [],
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    db.notes.unshift(newNote);
    await writeDb(db);
    await delay(200);
    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.post('/api/notes/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const db = await readDb();
    const idx = db.notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    const note = db.notes[idx];
    const likeIdx = note.likes.indexOf(userId);
    if (likeIdx === -1) {
      note.likes.push(userId);
    } else {
      note.likes.splice(likeIdx, 1);
    }
    await writeDb(db);
    await delay(50);
    res.json({ likes: note.likes, liked: likeIdx === -1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

app.post('/api/notes/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;
    if (!userId || !content) {
      res.status(400).json({ error: 'userId and content are required' });
      return;
    }
    const db = await readDb();
    const idx = db.notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    const newComment: Comment = {
      id: uuidv4(),
      userId,
      content,
      createdAt: new Date().toISOString()
    };
    db.notes[idx].comments.push(newComment);
    await writeDb(db);
    await delay(80);
    res.status(201).json(db.notes[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.get('/api/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userTags = new Set(user.tags);

    const userCircles = db.circles.filter((c) => c.members.includes(userId));
    userCircles.forEach((c) => c.tags.forEach((t) => userTags.add(t)));

    const userBooks = db.books.filter((b) => b.ownerId === userId);
    userBooks.forEach((b) => b.tags.forEach((t) => userTags.add(t)));

    const recommendedBooks = db.books
      .filter((b) => b.ownerId !== userId && b.status !== 'offline')
      .map((b) => {
        const matchScore = b.tags.filter((t) => userTags.has(t)).length +
          (b.category && userTags.has(b.category) ? 1 : 0);
        return { book: b, score: matchScore };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.book);

    const recommendedUsers = db.users
      .filter((u) => u.id !== userId)
      .map((u) => {
        const score = u.tags.filter((t) => userTags.has(t)).length;
        return { user: u, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.user);

    await delay(120);
    res.json({
      books: recommendedBooks,
      users: recommendedUsers,
      userTags: Array.from(userTags)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
