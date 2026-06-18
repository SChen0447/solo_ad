import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Note {
  id: string;
  title: string;
  content: string;
  creator: string;
  x: number;
  y: number;
  likes: number;
  createdAt: number;
}

let notes: Note[] = [];

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

app.get('/api/notes', (_req: Request, res: Response<Note[]>) => {
  res.json(notes);
});

app.post('/api/notes', (req: Request, res: Response<Note>) => {
  const { title, content, creator, x, y } = req.body;
  const newNote: Note = {
    id: uuidv4(),
    title,
    content,
    creator: creator || '匿名用户',
    x,
    y,
    likes: 0,
    createdAt: Date.now()
  };
  notes.push(newNote);
  res.json(newNote);
});

app.put('/api/notes/:id/like', (req: Request, res: Response<Note | { error: string }>) => {
  const { id } = req.params;
  const note = notes.find(n => n.id === id);
  if (note) {
    note.likes += 1;
    res.json(note);
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.put('/api/notes/:id/position', (req: Request, res: Response<Note | { error: string }>) => {
  const { id } = req.params;
  const { x, y } = req.body;
  const note = notes.find(n => n.id === id);
  if (note) {
    note.x = x;
    note.y = y;
    res.json(note);
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.get('/api/export', (_req: Request, res: Response<{ notes: Note[]; exportedAt: number }>) => {
  res.json({
    notes,
    exportedAt: Date.now()
  });
});

app.post('/api/import', (req: Request, res: Response<{ success: boolean; count: number }>) => {
  const { notes: importedNotes } = req.body;
  if (Array.isArray(importedNotes)) {
    notes = importedNotes.map((note: Partial<Note>) => ({
      id: note.id || uuidv4(),
      title: note.title || '',
      content: note.content || '',
      creator: note.creator || '匿名用户',
      x: note.x || 0,
      y: note.y || 0,
      likes: note.likes || 0,
      createdAt: note.createdAt || Date.now()
    }));
    res.json({ success: true, count: notes.length });
  } else {
    res.status(400).json({ success: false, count: 0 });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
