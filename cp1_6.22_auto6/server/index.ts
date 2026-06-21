import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  createMindMap,
  getMindMap,
  getMindMapByShareToken,
  listMindMaps,
  deleteMindMap,
  setShareToken,
  getNodes,
  createNode,
  updateNode,
  deleteNode,
  MindMap,
  Node
} from './db';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const distClientPath = path.resolve(__dirname, '../dist/client');
if (fs.existsSync(distClientPath)) {
  app.use(express.static(distClientPath));
}

interface OnlineUser {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  editingNodeId: string | null;
}

interface RoomState {
  users: Map<string, OnlineUser>;
}

const rooms = new Map<string, RoomState>();

const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

function getRoomState(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Map() });
  }
  return rooms.get(roomId)!;
}

function generateUserName(): string {
  const names = ['小蓝', '小绿', '小红', '小紫', '小黄', '小橙', '小青', '小粉', '小棕', '小银'];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
}

app.get('/api/mindmaps', (_req, res) => {
  const maps = listMindMaps();
  res.json(maps);
});

app.post('/api/mindmaps', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: '标题不能为空' });
  }
  const id = uuidv4();
  const map = createMindMap(id, title.trim());
  res.json(map);
});

app.get('/api/mindmaps/:id', (req, res) => {
  const map = getMindMap(req.params.id);
  if (!map) {
    return res.status(404).json({ error: '思维导图不存在' });
  }
  const nodes = getNodes(req.params.id);
  res.json({ ...map, nodes });
});

app.delete('/api/mindmaps/:id', (req, res) => {
  const map = getMindMap(req.params.id);
  if (!map) {
    return res.status(404).json({ error: '思维导图不存在' });
  }
  deleteMindMap(req.params.id);
  io.to(`map-${req.params.id}`).emit('mindmap:deleted');
  res.json({ success: true });
});

app.post('/api/mindmaps/:id/share', (req, res) => {
  const map = getMindMap(req.params.id);
  if (!map) {
    return res.status(404).json({ error: '思维导图不存在' });
  }
  const token = uuidv4().replace(/-/g, '').slice(0, 8);
  setShareToken(req.params.id, token);
  res.json({ token, url: `/collab/${token}` });
});

app.get('/api/collab/:token', (req, res) => {
  const map = getMindMapByShareToken(req.params.token);
  if (!map) {
    return res.status(404).json({ error: '链接无效或已过期' });
  }
  const nodes = getNodes(map.id);
  res.json({ ...map, nodes, readOnly: true });
});

if (fs.existsSync(distClientPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distClientPath, 'index.html'));
  });
}

io.on('connection', (socket: Socket) => {
  let currentRoom: string | null = null;
  let currentUser: OnlineUser | null = null;

  socket.on('room:join', ({ mindmapId, userName }: { mindmapId: string; userName?: string }) => {
    const map = getMindMap(mindmapId);
    if (!map) {
      socket.emit('error', { message: '思维导图不存在' });
      return;
    }

    const roomId = `map-${mindmapId}`;
    currentRoom = roomId;

    const roomState = getRoomState(roomId);
    const usedColors = Array.from(roomState.users.values()).map(u => u.color);
    const availableColors = userColors.filter(c => !usedColors.includes(c));
    const color = availableColors.length > 0
      ? availableColors[0]
      : userColors[Math.floor(Math.random() * userColors.length)];

    currentUser = {
      id: socket.id,
      name: userName || generateUserName(),
      color,
      x: 0,
      y: 0,
      editingNodeId: null
    };

    roomState.users.set(socket.id, currentUser);
    socket.join(roomId);

    socket.emit('user:init', { user: currentUser });
    io.to(roomId).emit('room:users', {
      users: Array.from(roomState.users.values())
    });

    const nodes = getNodes(mindmapId);
    socket.emit('map:init', { map, nodes });
  });

  socket.on('room:join-share', ({ token }: { token: string }) => {
    const map = getMindMapByShareToken(token);
    if (!map) {
      socket.emit('error', { message: '链接无效或已过期' });
      return;
    }

    const roomId = `map-${map.id}`;
    currentRoom = roomId;

    const roomState = getRoomState(roomId);
    const usedColors = Array.from(roomState.users.values()).map(u => u.color);
    const availableColors = userColors.filter(c => !usedColors.includes(c));
    const color = availableColors.length > 0
      ? availableColors[0]
      : userColors[Math.floor(Math.random() * userColors.length)];

    currentUser = {
      id: socket.id,
      name: generateUserName(),
      color,
      x: 0,
      y: 0,
      editingNodeId: null
    };

    roomState.users.set(socket.id, currentUser);
    socket.join(roomId);

    socket.emit('user:init', { user: currentUser, readOnly: true });
    io.to(roomId).emit('room:users', {
      users: Array.from(roomState.users.values())
    });

    const nodes = getNodes(map.id);
    socket.emit('map:init', { map, nodes, readOnly: true });
  });

  socket.on('cursor:move', ({ x, y }: { x: number; y: number }) => {
    if (!currentRoom || !currentUser) return;
    currentUser.x = x;
    currentUser.y = y;
    socket.to(currentRoom).emit('cursor:update', { user: currentUser });
  });

  socket.on('node:editing', ({ nodeId }: { nodeId: string | null }) => {
    if (!currentRoom || !currentUser) return;
    currentUser.editingNodeId = nodeId;
    socket.to(currentRoom).emit('cursor:update', { user: currentUser });
  });

  socket.on('node:create', (nodeData: Omit<Node, 'created_at' | 'updated_at'>) => {
    if (!currentRoom) return;
    try {
      const node = createNode(nodeData);
      socket.to(currentRoom).emit('node:created', { node, userId: socket.id });
      socket.emit('node:created', { node, userId: socket.id, own: true });
    } catch (e) {
      console.error('create node error:', e);
    }
  });

  socket.on('node:update', ({ id, updates }: { id: string; updates: any }) => {
    if (!currentRoom) return;
    try {
      const node = updateNode(id, updates);
      socket.to(currentRoom).emit('node:updated', { node, userId: socket.id });
      socket.emit('node:updated', { node, userId: socket.id, own: true });
    } catch (e) {
      console.error('update node error:', e);
    }
  });

  socket.on('node:delete', ({ id }: { id: string }) => {
    if (!currentRoom) return;
    try {
      const mindmapId = deleteNode(id);
      if (mindmapId) {
        socket.to(currentRoom).emit('node:deleted', { id, userId: socket.id });
        socket.emit('node:deleted', { id, userId: socket.id, own: true });
      }
    } catch (e) {
      console.error('delete node error:', e);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      const roomState = rooms.get(currentRoom);
      if (roomState) {
        roomState.users.delete(socket.id);
        io.to(currentRoom).emit('room:users', {
          users: Array.from(roomState.users.values())
        });
        if (roomState.users.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
