import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { MapModel, MindMapNode, EditingUser } from './models/MapModel';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const mapModel = new MapModel();
const defaultMap = mapModel.createMindMap();

const USER_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
];

const USER_NAMES = [
  '小蓝', '小红', '小绿', '小黄',
  '小紫', '小橙', '小青', '小粉',
];

interface JoinMapData {
  mapId: string;
}

interface NodeActionData {
  mapId: string;
  nodeId?: string;
  parentId?: string | null;
  x?: number;
  y?: number;
  color?: string;
  text?: string;
  updates?: Partial<Omit<MindMapNode, 'id' | 'createdAt'>>;
}

interface FocusNodeData {
  mapId: string;
  nodeId: string | null;
}

app.use(express.json());

app.get('/api/maps/:mapId', (req, res) => {
  const map = mapModel.getMindMap(req.params.mapId);
  if (!map) {
    return res.status(404).json({ error: '思维导图不存在' });
  }
  res.json(map);
});

app.post('/api/maps', (_req, res) => {
  const map = mapModel.createMindMap();
  res.status(201).json(map);
});

app.delete('/api/maps/:mapId/nodes/:nodeId', (req, res) => {
  const success = mapModel.deleteNode(req.params.mapId, req.params.nodeId);
  if (!success) {
    return res.status(404).json({ error: '节点不存在' });
  }
  res.json({ success: true });
});

io.on('connection', (socket) => {
  let currentMapId: string | null = null;
  let currentUser: EditingUser | null = null;

  const userIndex = Math.floor(Math.random() * USER_COLORS.length);

  socket.on('join-map', (data: JoinMapData) => {
    const { mapId } = data;
    const map = mapModel.getMindMap(mapId);
    
    if (!map) {
      socket.emit('error-message', { message: '思维导图不存在' });
      return;
    }

    currentMapId = mapId;
    currentUser = {
      socketId: socket.id,
      userId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      color: USER_COLORS[userIndex],
      userName: USER_NAMES[userIndex],
      nodeId: null,
    };

    mapModel.addEditingUser(mapId, currentUser);
    socket.join(mapId);

    socket.emit('map-data', map);
    socket.emit('current-user', currentUser);
    
    io.to(mapId).emit('users-update', mapModel.getEditingUsers(mapId));
    io.to(mapId).emit('user-joined', currentUser);
  });

  socket.on('add-node', (data: NodeActionData) => {
    if (!currentMapId || !currentUser) return;

    const node = mapModel.addNode(
      currentMapId,
      data.parentId ?? null,
      data.x ?? 0,
      data.y ?? 0,
      data.color,
      data.text
    );

    if (node) {
      io.to(currentMapId).emit('node-added', { node, byUser: currentUser });
    }
  });

  socket.on('update-node', (data: NodeActionData) => {
    if (!currentMapId || !currentUser || !data.nodeId || !data.updates) return;

    const node = mapModel.updateNode(currentMapId, data.nodeId, data.updates);

    if (node) {
      io.to(currentMapId).emit('node-updated', { 
        nodeId: data.nodeId, 
        updates: data.updates, 
        byUser: currentUser 
      });
    }
  });

  socket.on('delete-node', (data: NodeActionData) => {
    if (!currentMapId || !currentUser || !data.nodeId) return;

    const success = mapModel.deleteNode(currentMapId, data.nodeId);
    if (success) {
      io.to(currentMapId).emit('node-deleted', { nodeId: data.nodeId, byUser: currentUser });
    }
  });

  socket.on('focus-node', (data: FocusNodeData) => {
    if (!currentMapId || !currentUser) return;
    
    currentUser.nodeId = data.nodeId;
    mapModel.updateEditingUserNode(currentMapId, socket.id, data.nodeId);
    
    io.to(currentMapId).emit('users-update', mapModel.getEditingUsers(currentMapId));
  });

  socket.on('disconnect', () => {
    if (currentMapId && currentUser) {
      mapModel.removeEditingUser(currentMapId, socket.id);
      io.to(currentMapId).emit('users-update', mapModel.getEditingUsers(currentMapId));
      io.to(currentMapId).emit('user-left', currentUser);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`默认思维导图ID: ${defaultMap.id}`);
});
