const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentNickname = null;
  let currentUserId = null;

  socket.emit('connected');

  socket.on('join-room', ({ roomName, nickname, userId }) => {
    currentRoom = roomName;
    currentNickname = nickname;
    currentUserId = userId;

    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Map());
    }

    const room = rooms.get(roomName);
    const existingUsers = Array.from(room.entries()).map(([id, name]) => ({
      userId: id,
      nickname: name,
    }));

    socket.emit('existing-users', existingUsers);

    room.set(userId, nickname);

    socket.to(roomName).emit('user-joined', { userId, nickname });
    socket.join(roomName);
  });

  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { from: currentUserId, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { from: currentUserId, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { from: currentUserId, candidate });
  });

  socket.on('drawing-box', ({ box }) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('drawing-box', { box });
    }
  });

  socket.on('leave-room', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.delete(currentUserId);
      socket.to(currentRoom).emit('user-left', { userId: currentUserId });

      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    }
    socket.leave(currentRoom);
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.delete(currentUserId);
      socket.to(currentRoom).emit('user-left', { userId: currentUserId });

      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});
