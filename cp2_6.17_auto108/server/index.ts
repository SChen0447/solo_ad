import express = require('express');
import http = require('http');
import { Server, Socket } from 'socket.io';
import cors = require('cors');
import multer = require('multer');
import { v4 as uuidv4 } from 'uuid';
import fs = require('fs');
import path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface User {
  id: string;
  nickname: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploader: string;
  createdAt: number;
}

interface DrawingPath {
  type: 'path';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  id: string;
}

interface DrawingText {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  id: string;
}

type DrawingItem = DrawingPath | DrawingText;

interface Room {
  users: Map<string, User>;
  todos: TodoItem[];
  files: FileItem[];
  drawings: DrawingItem[];
  createdAt: number;
}

const rooms = new Map<string, Room>();

const ROOM_TTL = 24 * 60 * 60 * 1000;
const FILE_TTL = 3 * 24 * 60 * 60 * 1000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片和PDF文件'));
    }
  },
});

app.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  const { roomCode, nickname } = req.body;
  if (!roomCode || !nickname) {
    return res.status(400).json({ error: '缺少房间码或昵称' });
  }

  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const fileItem: FileItem = {
    id: uuidv4(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploader: nickname,
    createdAt: Date.now(),
  };

  room.files.push(fileItem);
  io.to(roomCode).emit('file:added', fileItem);

  res.json({ success: true, file: fileItem });
});

app.get('/files/:fileId', (req, res) => {
  const { fileId } = req.params;

  for (const room of rooms.values()) {
    const file = room.files.find((f) => f.id === fileId);
    if (file) {
      if (Date.now() - file.createdAt > FILE_TTL) {
        return res.status(410).json({ error: '文件已过期' });
      }
      const filePath = path.join(uploadsDir, file.filename);
      if (fs.existsSync(filePath)) {
        res.download(filePath, file.originalName);
        return;
      }
    }
  }
  res.status(404).json({ error: '文件不存在' });
});

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getOrCreateRoom(roomCode: string): Room {
  let room = rooms.get(roomCode);
  if (!room) {
    room = {
      users: new Map(),
      todos: [],
      files: [],
      drawings: [],
      createdAt: Date.now(),
    };
    rooms.set(roomCode, room);
  }
  return room;
}

io.on('connection', (socket: Socket) => {
  console.log('用户连接:', socket.id);

  socket.on('room:join', ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
    let finalRoomCode = roomCode;
    if (!finalRoomCode || finalRoomCode.trim() === '') {
      do {
        finalRoomCode = generateRoomCode();
      } while (rooms.has(finalRoomCode));
    }

    const room = getOrCreateRoom(finalRoomCode);
    room.users.set(socket.id, { id: socket.id, nickname });

    socket.join(finalRoomCode);

    socket.emit('room:joined', {
      roomCode: finalRoomCode,
      todos: room.todos,
      files: room.files,
      drawings: room.drawings,
    });

    const userList = Array.from(room.users.values());
    io.to(finalRoomCode).emit('room:users', userList);
    console.log(`用户 ${nickname} 加入房间 ${finalRoomCode}`);
  });

  socket.on('drawing:data', ({ roomCode, drawing }: { roomCode: string; drawing: DrawingItem }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.drawings.push(drawing);
    socket.to(roomCode).emit('drawing:data', drawing);
  });

  socket.on('drawing:clear', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.drawings = [];
    socket.to(roomCode).emit('drawing:clear');
  });

  socket.on('drawing:move-text', ({ roomCode, textId, x, y }: { roomCode: string; textId: string; x: number; y: number }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const drawing = room.drawings.find((d) => d.id === textId && d.type === 'text');
    if (drawing && drawing.type === 'text') {
      drawing.x = x;
      drawing.y = y;
      socket.to(roomCode).emit('drawing:text-moved', { textId, x, y });
    }
  });

  socket.on('todo:add', ({ roomCode, text }: { roomCode: string; text: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const todo: TodoItem = {
      id: uuidv4(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    room.todos.push(todo);
    io.to(roomCode).emit('todo:added', todo);
  });

  socket.on('todo:toggle', ({ roomCode, todoId }: { roomCode: string; todoId: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const todo = room.todos.find((t) => t.id === todoId);
    if (todo) {
      todo.completed = !todo.completed;
      io.to(roomCode).emit('todo:toggled', { todoId, completed: todo.completed });
    }
  });

  socket.on('todo:delete', ({ roomCode, todoId }: { roomCode: string; todoId: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.todos = room.todos.filter((t) => t.id !== todoId);
    io.to(roomCode).emit('todo:deleted', todoId);
  });

  socket.on('disconnect', () => {
    for (const [roomCode, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        const userList = Array.from(room.users.values());
        io.to(roomCode).emit('room:users', userList);
        console.log(`用户 ${user?.nickname} 离开房间 ${roomCode}`);

        if (room.users.size === 0 && Date.now() - room.createdAt > ROOM_TTL) {
          room.files.forEach((file) => {
            const filePath = path.join(uploadsDir, file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
          rooms.delete(roomCode);
          console.log(`房间 ${roomCode} 已销毁`);
        }
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL) {
      room.files.forEach((file) => {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      rooms.delete(roomCode);
      console.log(`房间 ${roomCode} 因超时已销毁`);
    }
  }
}, 60 * 1000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
