import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import type { Agenda, Topic, Note, ActionItem, Attachment } from '../shared/types';

const require = createRequire(import.meta.url);
const NeDB = require('nedb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const agendasDb = new NeDB({ filename: path.join(dataDir, 'agendas.db'), autoload: true });
const notesDb = new NeDB({ filename: path.join(dataDir, 'notes.db'), autoload: true });
const actionsDb = new NeDB({ filename: path.join(dataDir, 'actions.db'), autoload: true });

function promisifyDb<T>(fn: Function, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(...args, (err: Error | null, result: T) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

app.get('/api/agendas', async (_req, res) => {
  try {
    const docs = await promisifyDb<Agenda[]>(agendasDb.find.bind(agendasDb), {});
    const sorted = docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agendas' });
  }
});

app.get('/api/agendas/:id', async (req, res) => {
  try {
    const doc = await promisifyDb<Agenda>(agendasDb.findOne.bind(agendasDb), { _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agenda' });
  }
});

app.post('/api/agendas', async (req, res) => {
  try {
    const agenda: Agenda = {
      _id: uuidv4(),
      title: req.body.title || '未命名会议',
      time: req.body.time || new Date().toISOString(),
      participants: req.body.participants || [],
      description: req.body.description || '',
      topics: [],
      createdAt: new Date().toISOString(),
    };
    agenda.topics = (req.body.topics || []).map((t: any, i: number) => ({
      id: uuidv4(),
      title: t.title || '',
      assignee: t.assignee || '',
      deadline: t.deadline || '',
      completed: false,
      order: i,
    }));
    await promisifyDb<void>(agendasDb.insert.bind(agendasDb), agenda);
    res.json(agenda);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create agenda' });
  }
});

app.put('/api/agendas/:id', async (req, res) => {
  try {
    const update: any = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.time !== undefined) update.time = req.body.time;
    if (req.body.participants !== undefined) update.participants = req.body.participants;
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.topics !== undefined) update.topics = req.body.topics;
    await promisifyDb<number>(agendasDb.update.bind(agendasDb), { _id: req.params.id }, { $set: update });
    const doc = await promisifyDb<Agenda>(agendasDb.findOne.bind(agendasDb), { _id: req.params.id });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update agenda' });
  }
});

app.delete('/api/agendas/:id', async (req, res) => {
  try {
    await promisifyDb<number>(agendasDb.remove.bind(agendasDb), { _id: req.params.id });
    await promisifyDb<number>(notesDb.remove.bind(notesDb), { agendaId: req.params.id }, { multi: true });
    await promisifyDb<number>(actionsDb.remove.bind(actionsDb), { agendaId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete agenda' });
  }
});

app.get('/api/notes/:agendaId', async (req, res) => {
  try {
    const docs = await promisifyDb<Note[]>(notesDb.find.bind(notesDb), { agendaId: req.params.agendaId });
    const sorted = docs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.get('/api/notes/:agendaId/:topicId', async (req, res) => {
  try {
    const docs = await promisifyDb<Note[]>(notesDb.find.bind(notesDb), {
      agendaId: req.params.agendaId,
      topicId: req.params.topicId,
    });
    const sorted = docs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.get('/api/actions', async (req, res) => {
  try {
    const query: any = {};
    if (req.query.assignee) query.assignee = req.query.assignee as string;
    if (req.query.priority) query.priority = req.query.priority as string;
    if (req.query.status) query.status = req.query.status as string;
    if (req.query.deadlineFrom || req.query.deadlineTo) {
      query.deadline = {};
      if (req.query.deadlineFrom) (query.deadline as any).$gte = req.query.deadlineFrom as string;
      if (req.query.deadlineTo) (query.deadline as any).$lte = req.query.deadlineTo as string;
    }
    const docs = await promisifyDb<ActionItem[]>(actionsDb.find.bind(actionsDb), query);
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

app.get('/api/actions/:id', async (req, res) => {
  try {
    const doc = await promisifyDb<ActionItem>(actionsDb.findOne.bind(actionsDb), { _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch action item' });
  }
});

app.post('/api/actions', async (req, res) => {
  try {
    const action: ActionItem = {
      _id: uuidv4(),
      title: req.body.title || '',
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assignee: req.body.assignee || '',
      deadline: req.body.deadline || '',
      topicId: req.body.topicId || '',
      agendaId: req.body.agendaId || '',
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    await promisifyDb<void>(actionsDb.insert.bind(actionsDb), action);
    res.json(action);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

app.put('/api/actions/:id', async (req, res) => {
  try {
    const update: any = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.priority !== undefined) update.priority = req.body.priority;
    if (req.body.assignee !== undefined) update.assignee = req.body.assignee;
    if (req.body.deadline !== undefined) update.deadline = req.body.deadline;
    if (req.body.comments !== undefined) update.comments = req.body.comments;
    if (req.body.attachments !== undefined) update.attachments = req.body.attachments;
    await promisifyDb<number>(actionsDb.update.bind(actionsDb), { _id: req.params.id }, { $set: update });
    const doc = await promisifyDb<ActionItem>(actionsDb.findOne.bind(actionsDb), { _id: req.params.id });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

app.delete('/api/actions/:id', async (req, res) => {
  try {
    await promisifyDb<number>(actionsDb.remove.bind(actionsDb), { _id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete action item' });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/actions/:id/attachments', upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const doc = await promisifyDb<ActionItem>(actionsDb.findOne.bind(actionsDb), { _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const newAttachments: Attachment[] = (files || []).map((f) => ({
      id: uuidv4(),
      filename: f.originalname,
      size: f.size,
      url: `/uploads/${f.filename}`,
      uploadedAt: new Date().toISOString(),
    }));
    const updatedAttachments = [...(doc.attachments || []), ...newAttachments];
    await promisifyDb<number>(actionsDb.update.bind(actionsDb), { _id: req.params.id }, { $set: { attachments: updatedAttachments } });
    const updated = await promisifyDb<ActionItem>(actionsDb.findOne.bind(actionsDb), { _id: req.params.id });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

io.on('connection', (socket) => {
  socket.on('join-agenda', (agendaId: string) => {
    socket.join(`agenda:${agendaId}`);
  });

  socket.on('leave-agenda', (agendaId: string) => {
    socket.leave(`agenda:${agendaId}`);
  });

  socket.on('add-note', async (data: { agendaId: string; topicId: string; nickname: string; content: string }) => {
    const note: Note = {
      id: uuidv4(),
      topicId: data.topicId,
      agendaId: data.agendaId,
      nickname: data.nickname,
      content: data.content,
      timestamp: new Date().toISOString(),
    };
    await promisifyDb<void>(notesDb.insert.bind(notesDb), note);
    io.to(`agenda:${data.agendaId}`).emit('new-note', note);
  });

  socket.on('retract-note', async (data: { agendaId: string; noteId: string; nickname: string }) => {
    const note = await promisifyDb<Note>(notesDb.findOne.bind(notesDb), { id: data.noteId });
    if (note && note.nickname === data.nickname) {
      await promisifyDb<number>(notesDb.remove.bind(notesDb), { id: data.noteId });
      io.to(`agenda:${data.agendaId}`).emit('note-retracted', { noteId: data.noteId });
    }
  });

  socket.on('topic-updated', (data: { agendaId: string; topics: Topic[] }) => {
    socket.to(`agenda:${data.agendaId}`).emit('topics-updated', data.topics);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
