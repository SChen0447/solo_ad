import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { WhiteboardElement, User, Point, Snapshot } from '../src/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const USERNAMES = ['小熊猫', '独角兽', '北极星', '彩虹糖', '小海豚', '萤火虫', '云之君', '咖啡豆', '小蜜蜂', '月亮船'];
const COLORS = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff6b81', '#00d2d3', '#54a0ff', '#5f27cd', '#ff9ff3', '#ff6348', '#48dbfb'];

let elements: WhiteboardElement[] = [];
const users: Map<string, User> = new Map();
let snapshots: Snapshot[] = [];

function getRandomName(): string {
  return USERNAMES[Math.floor(Math.random() * USERNAMES.length)] + '-' + Math.floor(Math.random() * 1000);
}

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

io.on('connection', (socket) => {
  const userId = socket.id;
  const user: User = {
    id: userId,
    name: getRandomName(),
    color: getRandomColor(),
    cursor: { x: 0, y: 0 },
  };
  users.set(userId, user);

  socket.emit('init', {
    user,
    users: Array.from(users.values()),
    elements,
    snapshots,
  });

  socket.broadcast.emit('user:join', user);

  socket.on('cursor:move', (cursor: Point) => {
    const u = users.get(userId);
    if (u) {
      u.cursor = cursor;
      socket.broadcast.emit('cursor:update', { userId, cursor });
    }
  });

  socket.on('draw:start', (data: { element: WhiteboardElement }) => {
    elements.push(data.element);
    socket.broadcast.emit('draw:start', data);
  });

  socket.on('draw:continue', (data: { id: string; point: Point }) => {
    const el = elements.find((e) => e.id === data.id) as any;
    if (el && el.type === 'path') {
      el.points.push(data.point);
    }
    socket.broadcast.emit('draw:continue', data);
  });

  socket.on('draw:end', (data: { id: string }) => {
    socket.broadcast.emit('draw:end', data);
  });

  socket.on('element:add', (data: { element: WhiteboardElement }) => {
    elements.push(data.element);
    socket.broadcast.emit('element:add', data);
  });

  socket.on('element:update', (data: { id: string; updates: Partial<WhiteboardElement> }) => {
    const idx = elements.findIndex((e) => e.id === data.id);
    if (idx !== -1) {
      elements[idx] = { ...elements[idx], ...data.updates } as WhiteboardElement;
      socket.broadcast.emit('element:update', data);
    }
  });

  socket.on('element:remove', (data: { id: string }) => {
    elements = elements.filter((e) => e.id !== data.id);
    socket.broadcast.emit('element:remove', data);
  });

  socket.on('snapshot:save', (data: { snapshot: Snapshot }) => {
    snapshots.push(data.snapshot);
    if (snapshots.length > 50) snapshots = snapshots.slice(-50);
    io.emit('snapshot:list', snapshots);
  });

  socket.on('snapshot:restore', (data: { snapshotId: string }) => {
    const snap = snapshots.find((s) => s.id === data.snapshotId);
    if (snap) {
      elements = JSON.parse(JSON.stringify(snap.elements));
      io.emit('snapshot:restored', { elements });
    }
  });

  socket.on('elements:replace', (data: { elements: WhiteboardElement[] }) => {
    elements = data.elements;
    socket.broadcast.emit('elements:replace', data);
  });

  socket.on('disconnect', () => {
    users.delete(userId);
    socket.broadcast.emit('user:leave', { userId });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Whiteboard server running on port ${PORT}`);
});
