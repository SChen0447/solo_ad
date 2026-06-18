import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { roomManager } from './roomManager';
import type { CreateRoomRequest, JoinRoomRequest, User, ClientToServerEvents, ServerToClientEvents } from '../types';
import { SERVER, AVATAR_COLORS } from '../utils/constants';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/rooms', (req, res) => {
  const { topic, duration, nickname } = req.body as CreateRoomRequest;
  if (!topic || !nickname) {
    return res.status(400).json({ error: '主题和昵称必填' });
  }
  const user: User = {
    id: uuidv4(),
    nickname,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  const room = roomManager.createRoom(topic, duration, user);
  res.json({ room, user });
});

app.post('/api/rooms/join', (req, res) => {
  const { code, nickname } = req.body as JoinRoomRequest;
  if (!code || !nickname) {
    return res.status(400).json({ error: '房间码和昵称必填' });
  }
  const room = roomManager.getRoomByCode(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const user: User = {
    id: uuidv4(),
    nickname,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
  roomManager.addUser(room.id, user);
  res.json({ room, user });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('room:join', ({ roomId, user }) => {
    const room = roomManager.addUser(roomId, user);
    if (!room) return;
    currentRoomId = roomId;
    currentUserId = user.id;
    socket.join(roomId);
    socket.to(roomId).emit('user:joined', user);
    socket.emit('room:state', room);
  });

  socket.on('room:leave', (roomId) => {
    if (!roomId || !currentUserId) return;
    socket.leave(roomId);
    const room = roomManager.removeUser(roomId, currentUserId);
    if (room) {
      socket.to(roomId).emit('user:left', currentUserId);
    }
    currentRoomId = null;
    currentUserId = null;
  });

  socket.on('note:create', ({ roomId, note }) => {
    const room = roomManager.addNote(roomId, note);
    if (!room) return;
    socket.to(roomId).emit('note:created', note);
  });

  socket.on('note:update', ({ roomId, note }) => {
    const room = roomManager.updateNote(roomId, note);
    if (!room) return;
    socket.to(roomId).emit('note:updated', note);
  });

  socket.on('note:delete', ({ roomId, noteId }) => {
    const room = roomManager.deleteNote(roomId, noteId);
    if (!room) return;
    socket.to(roomId).emit('note:deleted', noteId);
  });

  socket.on('vote:cast', ({ roomId, vote }) => {
    const room = roomManager.updateVote(roomId, vote);
    if (!room) return;
    socket.to(roomId).emit('vote:cast', vote);
    socket.emit('vote:cast', vote);
  });

  socket.on('vote:end', (roomId) => {
    const room = roomManager.endVoting(roomId);
    if (!room) return;
    io.to(roomId).emit('vote:ended');
  });

  socket.on('user:speaking', ({ roomId, userId }) => {
    const room = roomManager.setUserSpeaking(roomId, userId, true);
    if (!room) return;
    socket.to(roomId).emit('user:speaking', userId);
    setTimeout(() => {
      roomManager.setUserSpeaking(roomId, userId, false);
    }, 2000);
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      const room = roomManager.removeUser(currentRoomId, currentUserId);
      if (room) {
        socket.to(currentRoomId).emit('user:left', currentUserId);
      }
    }
  });
});

server.listen(SERVER.PORT, () => {
  console.log(`Server running on port ${SERVER.PORT}`);
  console.log(`Health check: http://localhost:${SERVER.PORT}/api/health`);
});
