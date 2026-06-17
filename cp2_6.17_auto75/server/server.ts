import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

interface Point {
  x: number;
  y: number;
}

interface Path {
  id: string;
  type: 'path';
  points: Point[];
  color: string;
  width: number;
  userId: string;
  userName: string;
}

interface Rect {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  userId: string;
  userName: string;
}

interface Text {
  id: string;
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  userId: string;
  userName: string;
}

interface StickyNote {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  bgColor: string;
  userId: string;
  userName: string;
}

interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
  userId: string;
  userName: string;
}

type DrawElement = Path | Rect | Text | StickyNote | ImageElement;

interface DrawEvent {
  type: 'draw' | 'update' | 'delete';
  element: DrawElement;
  roomId: string;
  userId: string;
}

interface InitSyncMessage {
  type: 'init';
  elements: DrawElement[];
  roomId: string;
}

interface UserInfo {
  id: string;
  name: string;
  color: string;
}

interface Snapshot {
  id: string;
  timestamp: number;
  elements: DrawElement[];
  thumbnail?: string;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;
const MAX_SNAPSHOTS = 50;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface RoomState {
  elements: Map<string, DrawElement>;
  users: Map<string, UserInfo>;
  snapshots: Snapshot[];
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      elements: new Map(),
      users: new Map(),
      snapshots: []
    });
  }
  return rooms.get(roomId)!;
}

function getElementsArray(room: RoomState): DrawElement[] {
  return Array.from(room.elements.values());
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  let currentRoomId: string | null = null;
  let currentUserInfo: UserInfo | null = null;

  socket.on('joinRoom', (data: { roomId: string; userInfo: UserInfo }) => {
    const { roomId, userInfo } = data;
    currentRoomId = roomId;
    currentUserInfo = userInfo;

    const room = getOrCreateRoom(roomId);
    room.users.set(socket.id, userInfo);

    socket.join(roomId);
    console.log(`User ${userInfo.name} joined room ${roomId}`);

    const initMessage: InitSyncMessage = {
      type: 'init',
      elements: getElementsArray(room),
      roomId
    };
    socket.emit('init', initMessage);

    socket.to(roomId).emit('userJoined', userInfo);

    const onlineUsers = Array.from(room.users.values());
    io.to(roomId).emit('onlineUsers', onlineUsers);
  });

  socket.on('requestInitSync', (data: { roomId: string }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      const initMessage: InitSyncMessage = {
        type: 'init',
        elements: getElementsArray(room),
        roomId: data.roomId
      };
      socket.emit('init', initMessage);
    }
  });

  socket.on('draw', (data: DrawEvent) => {
    if (!currentRoomId) return;

    const room = getOrCreateRoom(currentRoomId);

    switch (data.type) {
      case 'draw':
        room.elements.set(data.element.id, data.element);
        break;
      case 'update':
        room.elements.set(data.element.id, data.element);
        break;
      case 'delete':
        room.elements.delete(data.element.id);
        break;
    }

    socket.to(currentRoomId).emit('draw', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (currentRoomId && currentUserInfo) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoomId).emit('userLeft', socket.id);

        const onlineUsers = Array.from(room.users.values());
        io.to(currentRoomId).emit('onlineUsers', onlineUsers);

        if (room.users.size === 0 && room.elements.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
  });
});

app.post('/api/board/:roomId/snapshot', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { elements, thumbnail } = req.body;

    if (!Array.isArray(elements)) {
      return res.status(400).json({ error: 'Invalid elements data' });
    }

    const room = getOrCreateRoom(roomId);
    elements.forEach((el: DrawElement) => {
      room.elements.set(el.id, el);
    });

    const snapshot: Snapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      elements: [...elements],
      thumbnail
    };

    room.snapshots.unshift(snapshot);
    if (room.snapshots.length > MAX_SNAPSHOTS) {
      room.snapshots = room.snapshots.slice(0, MAX_SNAPSHOTS);
    }

    console.log(`Snapshot saved for room ${roomId}: ${snapshot.id}`);
    res.json(snapshot);
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

app.get('/api/board/:roomId/snapshots', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);

    res.json(room.snapshots);
  } catch (error) {
    console.error('Error getting snapshots:', error);
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

app.get('/api/board/:roomId/restore', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { snapshot } = req.query;

    if (!snapshot || typeof snapshot !== 'string') {
      return res.status(400).json({ error: 'Snapshot ID required' });
    }

    const room = getOrCreateRoom(roomId);
    const targetSnapshot = room.snapshots.find(s => s.id === snapshot);

    if (!targetSnapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    room.elements.clear();
    targetSnapshot.elements.forEach(el => {
      room.elements.set(el.id, el);
    });

    io.to(roomId).emit('init', {
      type: 'init',
      elements: targetSnapshot.elements,
      roomId
    });

    console.log(`Snapshot restored for room ${roomId}: ${snapshot}`);
    res.json(targetSnapshot);
  } catch (error) {
    console.error('Error restoring snapshot:', error);
    res.status(500).json({ error: 'Failed to restore snapshot' });
  }
});

app.get('/api/board/:roomId/state', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);

    res.json({
      roomId,
      elementCount: room.elements.size,
      userCount: room.users.size,
      snapshotCount: room.snapshots.length,
      elements: getElementsArray(room)
    });
  } catch (error) {
    console.error('Error getting board state:', error);
    res.status(500).json({ error: 'Failed to get board state' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    rooms: rooms.size
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Team Ideation Board Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time collaboration`);
  console.log(`📸 Max snapshots per room: ${MAX_SNAPSHOTS}`);
});
