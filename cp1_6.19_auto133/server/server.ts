import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'canvas-data.json');

interface Point {
  x: number;
  y: number;
  jitterX: number;
  jitterY: number;
  alpha: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId: string;
  version: number;
}

interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green';
  userId: string;
  zIndex: number;
  version: number;
}

interface CanvasState {
  strokes: Stroke[];
  notes: StickyNoteData[];
  versions: { version: number; timestamp: number; snapshot: { strokes: Stroke[]; notes: StickyNoteData[] } }[];
  currentVersion: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  socketId: string;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#2ECC71'
];

const USER_NAMES = [
  '小太阳', '大梦想家', '创意使者', '思考者',
  '探险家', '艺术家', '工程师', '设计师',
  '产品经理', '魔法师', '旅行者', '筑梦者'
];

const DEFAULT_CANVAS: CanvasState = {
  strokes: [],
  notes: [],
  versions: [{ version: 0, timestamp: Date.now(), snapshot: { strokes: [], notes: [] } }],
  currentVersion: 0
};

let canvasState: CanvasState = loadCanvasState();
const users: Map<string, User> = new Map();

function loadCanvasState(): CanvasState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载画布数据失败:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CANVAS));
}

function saveCanvasState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(canvasState, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存画布数据失败:', e);
  }
}

function saveVersion() {
  canvasState.currentVersion++;
  canvasState.versions.push({
    version: canvasState.currentVersion,
    timestamp: Date.now(),
    snapshot: {
      strokes: JSON.parse(JSON.stringify(canvasState.strokes)),
      notes: JSON.parse(JSON.stringify(canvasState.notes))
    }
  });
  if (canvasState.versions.length > 50) {
    canvasState.versions.shift();
  }
  saveCanvasState();
}

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/api/canvas', (_req, res) => {
  res.json(canvasState);
});

app.get('/api/versions', (_req, res) => {
  res.json(canvasState.versions.map(v => ({
    version: v.version,
    timestamp: v.timestamp
  })));
});

app.post('/api/restore/:version', (req, res) => {
  const version = parseInt(req.params.version);
  const ver = canvasState.versions.find(v => v.version === version);
  if (ver) {
    canvasState.strokes = JSON.parse(JSON.stringify(ver.snapshot.strokes));
    canvasState.notes = JSON.parse(JSON.stringify(ver.snapshot.notes));
    canvasState.currentVersion = version;
    saveCanvasState();
    io.to('canvas-room').emit('canvas-restored', {
      strokes: canvasState.strokes,
      notes: canvasState.notes,
      version
    });
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: '版本不存在' });
  }
});

io.on('connection', (socket: Socket) => {
  const userId = uuidv4();
  const userColor = COLORS[users.size % COLORS.length];
  const userName = USER_NAMES[users.size % USER_NAMES.length] + ' ' + Math.floor(Math.random() * 1000);

  const user: User = {
    id: userId,
    name: userName,
    color: userColor,
    socketId: socket.id
  };
  users.set(userId, user);

  socket.join('canvas-room');

  socket.emit('init', {
    userId,
    userName,
    userColor,
    canvasState: {
      strokes: canvasState.strokes,
      notes: canvasState.notes
    },
    users: Array.from(users.values())
  });

  socket.to('canvas-room').emit('user-joined', user);

  socket.on('stroke-start', (data: { stroke: Stroke }) => {
    data.stroke.userId = userId;
    data.stroke.version = canvasState.currentVersion;
    canvasState.strokes.push(data.stroke);
    socket.to('canvas-room').emit('stroke-start', { ...data, userId });
  });

  socket.on('stroke-continue', (data: { strokeId: string; points: Point[] }) => {
    const stroke = canvasState.strokes.find(s => s.id === data.strokeId);
    if (stroke) {
      stroke.points.push(...data.points);
    }
    socket.to('canvas-room').emit('stroke-continue', { ...data, userId });
  });

  socket.on('stroke-end', (data: { strokeId: string }) => {
    saveCanvasState();
    socket.to('canvas-room').emit('stroke-end', { ...data, userId });
  });

  socket.on('stroke-undo', (data: { strokeId: string }) => {
    const idx = canvasState.strokes.findIndex(s => s.id === data.strokeId && s.userId === userId);
    if (idx !== -1) {
      canvasState.strokes.splice(idx, 1);
      saveVersion();
      socket.to('canvas-room').emit('stroke-undo', { ...data, userId });
    }
  });

  socket.on('note-create', (data: { note: StickyNoteData }) => {
    data.note.userId = userId;
    data.note.id = uuidv4();
    data.note.zIndex = Date.now();
    data.note.version = canvasState.currentVersion;
    canvasState.notes.push(data.note);
    saveVersion();
    socket.to('canvas-room').emit('note-create', { ...data, userId });
  });

  socket.on('note-update', (data: { note: StickyNoteData }) => {
    const idx = canvasState.notes.findIndex(n => n.id === data.note.id);
    if (idx !== -1) {
      canvasState.notes[idx] = { ...canvasState.notes[idx], ...data.note, version: canvasState.currentVersion };
      saveCanvasState();
    }
    socket.to('canvas-room').emit('note-update', { ...data, userId });
  });

  socket.on('note-move', (data: { noteId: string; x: number; y: number }) => {
    const note = canvasState.notes.find(n => n.id === data.noteId);
    if (note) {
      note.x = data.x;
      note.y = data.y;
    }
    socket.to('canvas-room').emit('note-move', { ...data, userId });
  });

  socket.on('note-move-end', (data: { noteId: string; x: number; y: number }) => {
    const note = canvasState.notes.find(n => n.id === data.noteId);
    if (note) {
      note.x = data.x;
      note.y = data.y;
      saveCanvasState();
    }
    socket.to('canvas-room').emit('note-move-end', { ...data, userId });
  });

  socket.on('note-delete', (data: { noteId: string }) => {
    const idx = canvasState.notes.findIndex(n => n.id === data.noteId);
    if (idx !== -1) {
      canvasState.notes.splice(idx, 1);
      saveVersion();
    }
    socket.to('canvas-room').emit('note-delete', { ...data, userId });
  });

  socket.on('cursor-move', (data: { x: number; y: number }) => {
    socket.to('canvas-room').emit('cursor-move', { ...data, userId });
  });

  socket.on('trail-update', (data: { elementId: string; trail: { x: number; y: number }[] }) => {
    socket.to('canvas-room').emit('trail-update', { ...data, userId });
  });

  socket.on('disconnect', () => {
    users.delete(userId);
    socket.to('canvas-room').emit('user-left', userId);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
