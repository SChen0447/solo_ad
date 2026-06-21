import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Path,
  TextItem,
  StickerItem,
  HistoryState,
  Point,
  DrawStartData,
  DrawMoveData,
  DrawEndData
} from '../src/types';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface RoomState {
  id: string;
  creatorId: string;
  users: Map<string, User>;
  history: HistoryState[];
  historyIndex: number;
}

const rooms = new Map<string, RoomState>();

const COLORS = [
  '#A78BFA', '#60A5FA', '#34D399', '#FBBF24',
  '#F87171', '#A3E635', '#22D3EE', '#FB923C',
  '#E879F9', '#818CF8', '#4ADE80', '#FCD34D'
];

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getAvatarColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getCurrentHistoryState(room: RoomState): HistoryState {
  if (room.historyIndex >= 0 && room.historyIndex < room.history.length) {
    return room.history[room.historyIndex];
  }
  return { paths: [], texts: [], stickers: [] };
}

function pushHistory(room: RoomState, state: HistoryState) {
  room.history = room.history.slice(0, room.historyIndex + 1);
  room.history.push(JSON.parse(JSON.stringify(state)));
  if (room.history.length > 100) {
    room.history.shift();
  } else {
    room.historyIndex++;
  }
  if (room.historyIndex >= 100) {
    room.historyIndex = 99;
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', ({ nickname }: { nickname: string }) => {
    const roomId = generateRoomId();
    const avatarColor = getAvatarColor(nickname);
    
    const user: User = {
      id: socket.id,
      nickname,
      isCreator: true,
      avatarColor
    };

    const initialState: HistoryState = { paths: [], texts: [], stickers: [] };
    
    const room: RoomState = {
      id: roomId,
      creatorId: socket.id,
      users: new Map(),
      history: [initialState],
      historyIndex: 0
    };
    
    room.users.set(socket.id, user);
    rooms.set(roomId, room);
    
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.nickname = nickname;

    socket.emit('roomCreated', { roomId, userId: socket.id });
    socket.emit('fullState', {
      ...initialState,
      users: Array.from(room.users.values()),
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('joinRoom', ({ roomId, nickname }: { roomId: string; nickname: string }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const avatarColor = getAvatarColor(nickname);
    const user: User = {
      id: socket.id,
      nickname,
      isCreator: false,
      avatarColor
    };

    room.users.set(socket.id, user);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.nickname = nickname;

    const currentState = getCurrentHistoryState(room);

    socket.emit('roomJoined', {
      roomId,
      userId: socket.id,
      users: Array.from(room.users.values())
    });

    socket.emit('fullState', {
      ...currentState,
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });

    socket.to(roomId).emit('userJoined', { user });

    const systemMessage = {
      id: uuidv4(),
      userId: 'system',
      nickname: '系统',
      avatarColor: '#9CA3AF',
      text: `${nickname} 加入了房间`,
      timestamp: Date.now(),
      type: 'system' as const
    };
    io.to(roomId).emit('messageReceived', systemMessage);
  });

  socket.on('drawStart', (data: DrawStartData) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('drawStart', { ...data, userId: socket.id });
  });

  socket.on('drawMove', (data: DrawMoveData) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('drawMove', { ...data, userId: socket.id });
  });

  socket.on('drawEnd', (data: DrawEndData) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const { pathId, points, tool, color, size } = data as any;
    
    const currentState = getCurrentHistoryState(room);
    const newState: HistoryState = {
      paths: [...currentState.paths],
      texts: [...currentState.texts],
      stickers: [...currentState.stickers]
    };

    const existingPathIndex = newState.paths.findIndex(p => p.id === pathId);
    if (existingPathIndex >= 0) {
      newState.paths[existingPathIndex] = {
        ...newState.paths[existingPathIndex],
        points
      };
    } else {
      const path: Path = {
        id: pathId,
        tool,
        points,
        color,
        size,
        userId: socket.id
      };
      newState.paths.push(path);
    }

    pushHistory(room, newState);
    
    io.to(roomId).emit('drawEnd', {
      pathId,
      userId: socket.id,
      points,
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('addText', (textItem: TextItem) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const currentState = getCurrentHistoryState(room);
    const newState: HistoryState = {
      paths: [...currentState.paths],
      texts: [...currentState.texts, { ...textItem, userId: socket.id }],
      stickers: [...currentState.stickers]
    };

    pushHistory(room, newState);

    io.to(roomId).emit('textAdded', {
      text: { ...textItem, userId: socket.id },
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('addSticker', (sticker: StickerItem) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const currentState = getCurrentHistoryState(room);
    const newState: HistoryState = {
      paths: [...currentState.paths],
      texts: [...currentState.texts],
      stickers: [...currentState.stickers, { ...sticker, userId: socket.id }]
    };

    pushHistory(room, newState);

    io.to(roomId).emit('stickerAdded', {
      sticker: { ...sticker, userId: socket.id },
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('moveSticker', ({ stickerId, x, y }: { stickerId: string; x: number; y: number }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const currentState = getCurrentHistoryState(room);
    const stickerIndex = currentState.stickers.findIndex(s => s.id === stickerId);
    
    if (stickerIndex >= 0) {
      const newState: HistoryState = {
        paths: [...currentState.paths],
        texts: [...currentState.texts],
        stickers: currentState.stickers.map((s, i) =>
          i === stickerIndex ? { ...s, x, y } : s
        )
      };
      pushHistory(room, newState);
    }

    io.to(roomId).emit('stickerMoved', {
      stickerId,
      x,
      y,
      userId: socket.id,
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('undo', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    if (room.historyIndex > 0) {
      room.historyIndex--;
    }

    const state = getCurrentHistoryState(room);
    io.to(roomId).emit('canvasUndo', {
      ...state,
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('redo', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    if (room.historyIndex < room.history.length - 1) {
      room.historyIndex++;
    }

    const state = getCurrentHistoryState(room);
    io.to(roomId).emit('canvasRedo', {
      ...state,
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('clearCanvas', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const newState: HistoryState = { paths: [], texts: [], stickers: [] };
    pushHistory(room, newState);

    io.to(roomId).emit('canvasCleared', {
      historyIndex: room.historyIndex,
      historyLength: room.history.length
    });
  });

  socket.on('sendMessage', ({ text }: { text: string }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || !roomId) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    const message = {
      id: uuidv4(),
      userId: socket.id,
      nickname: user.nickname,
      avatarColor: user.avatarColor,
      text,
      timestamp: Date.now(),
      type: 'message' as const
    };

    io.to(roomId).emit('messageReceived', message);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const nickname = socket.data.nickname;
    
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(socket.id);
        
        const remainingUsers = Array.from(room.users.values());
        
        if (remainingUsers.length === 0) {
          rooms.delete(roomId);
        } else {
          socket.to(roomId).emit('userLeft', { userId: socket.id });
          
          const systemMessage = {
            id: uuidv4(),
            userId: 'system',
            nickname: '系统',
            avatarColor: '#9CA3AF',
            text: `${nickname} 离开了房间`,
            timestamp: Date.now(),
            type: 'system' as const
          };
          io.to(roomId).emit('messageReceived', systemMessage);
        }
      }
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
