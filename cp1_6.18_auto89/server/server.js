import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoomSnapshot(room) {
  return {
    id: `v${room.versions.length + 1}`,
    content: room.content,
    timestamp: Date.now(),
    authors: { ...room.authorContributions },
  };
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('create-room', ({ userName }) => {
    const inviteCode = generateInviteCode();
    const roomId = inviteCode;
    currentUser = userName;
    currentRoom = roomId;

    rooms.set(roomId, {
      id: roomId,
      inviteCode,
      content: '',
      users: new Map([[socket.id, { name: userName, color: generateUserColor() }]]),
      versions: [],
      authorContributions: {},
      lastSnapshotTime: Date.now(),
    });

    const room = rooms.get(roomId);
    room.versions.push({
      id: 'v1',
      content: '',
      timestamp: Date.now(),
      authors: {},
    });

    socket.join(roomId);
    socket.emit('room-created', {
      roomId,
      inviteCode,
      content: '',
      users: Object.fromEntries(room.users),
      versions: room.versions,
    });
  });

  socket.on('join-room', ({ roomId, userName }) => {
    const room = rooms.get(roomId.toUpperCase()) || rooms.get(roomId);
    if (!room) {
      socket.emit('join-error', { message: '房间不存在' });
      return;
    }

    currentUser = userName;
    currentRoom = room.id;
    room.users.set(socket.id, { name: userName, color: generateUserColor() });

    socket.join(room.id);
    socket.emit('room-joined', {
      roomId: room.id,
      inviteCode: room.inviteCode,
      content: room.content,
      users: Object.fromEntries(room.users),
      versions: room.versions,
    });

    socket.to(room.id).emit('user-joined', {
      socketId: socket.id,
      user: { name: userName, color: room.users.get(socket.id).color },
    });
  });

  socket.on('content-change', ({ content, authorKey }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.content = content;

    if (authorKey) {
      if (!room.authorContributions[authorKey]) {
        room.authorContributions[authorKey] = '';
      }
    }

    socket.to(currentRoom).emit('content-update', { content, socketId: socket.id });

    const now = Date.now();
    if (now - room.lastSnapshotTime >= 10000) {
      room.lastSnapshotTime = now;
      const snapshot = createRoomSnapshot(room);
      room.versions.push(snapshot);
      io.to(currentRoom).emit('version-snapshot', snapshot);
    }
  });

  socket.on('manual-save', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.lastSnapshotTime = Date.now();
    const snapshot = createRoomSnapshot(room);
    room.versions.push(snapshot);
    io.to(currentRoom).emit('version-snapshot', snapshot);
  });

  socket.on('cursor-move', ({ offset, selectionStart, selectionEnd }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote-cursor', {
      socketId: socket.id,
      offset,
      selectionStart,
      selectionEnd,
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.users.delete(socket.id);
      socket.to(currentRoom).emit('user-left', { socketId: socket.id });

      if (room.users.size === 0) {
        setTimeout(() => {
          const r = rooms.get(currentRoom);
          if (r && r.users.size === 0) {
            rooms.delete(currentRoom);
          }
        }, 60000);
      }
    }
  });
});

function generateUserColor() {
  const colors = [
    '#E57373', '#64B5F6', '#81C784', '#FFB74D',
    '#BA68C8', '#4DD0E1', '#F06292', '#AED581',
    '#FF8A65', '#9575CD',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`故事织网服务器运行在 http://localhost:${PORT}`);
});
