import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { boardManager } from './boardManager';
import { userManager } from './userManager';
import { BaseElement, Operation, User } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

app.get('/api/boards', (_req, res) => {
  const boards = boardManager.getBoardList();
  const boardsWithParticipants = boards.map(board => ({
    ...board,
    participantCount: userManager.getBoardUserCount(board.id)
  }));
  res.json(boardsWithParticipants);
});

app.post('/api/boards', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '白板名称不能为空' });
  }
  const board = boardManager.createBoard(name);
  res.status(201).json(board);
});

app.get('/api/boards/:id', (req, res) => {
  const board = boardManager.getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: '白板不存在' });
  }
  const elements = boardManager.getElements(req.params.id);
  const participants = userManager.getBoardUserCount(req.params.id);
  res.json({
    id: board.id,
    name: board.name,
    elements,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    participantCount: participants
  });
});

app.get('/api/boards/:id/history', (req, res) => {
  const history = boardManager.getHistory(req.params.id);
  res.json(history);
});

app.post('/api/boards/:id/history', (req, res) => {
  const { userId, userName } = req.body;
  const snapshot = boardManager.saveSnapshot(req.params.id, userId, userName);
  if (!snapshot) {
    return res.status(404).json({ error: '白板不存在' });
  }
  res.status(201).json(snapshot);
});

app.post('/api/boards/:id/history/:snapshotId/restore', (req, res) => {
  const { userId, userName } = req.body;
  const elements = boardManager.restoreSnapshot(
    req.params.id,
    req.params.snapshotId,
    userId,
    userName
  );
  if (!elements) {
    return res.status(404).json({ error: '白板或快照不存在' });
  }

  io.to(req.params.id).emit('elements:restore', { elements, userId });

  res.json({ success: true, elements });
});

app.post('/api/users', (_req, res) => {
  const user = userManager.createUser();
  res.json(user);
});

app.put('/api/users/:id/name', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  const user = userManager.updateUserName(req.params.id, name);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  if (user.boardId) {
    io.to(user.boardId).emit('user:updated', user);
  }

  res.json(user);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('board:join', ({ boardId, userId }) => {
    console.log(`User ${userId} joining board ${boardId}`);

    const user = userManager.joinBoard(userId, boardId, socket.id);
    if (!user) {
      socket.emit('error', { message: '用户不存在' });
      return;
    }

    socket.join(boardId);

    const users = userManager.getBoardUsers(boardId);
    io.to(boardId).emit('user:joined', user);
    io.to(boardId).emit('users:list', users);

    const elements = boardManager.getElements(boardId);
    socket.emit('elements:init', elements);
  });

  socket.on('element:add', ({ boardId, element, userId }: { boardId: string; element: BaseElement; userId: string }) => {
    const newElement = boardManager.addElement(boardId, element, userId);
    if (newElement) {
      socket.to(boardId).emit('element:added', newElement);
    }
  });

  socket.on('element:update', ({ boardId, elementId, updates, userId }: { boardId: string; elementId: string; updates: Partial<BaseElement>; userId: string }) => {
    const updatedElement = boardManager.updateElement(boardId, elementId, updates, userId);
    if (updatedElement) {
      socket.to(boardId).emit('element:updated', { elementId, updates: updatedElement });
    }
  });

  socket.on('element:delete', ({ boardId, elementId, userId }: { boardId: string; elementId: string; userId: string }) => {
    const deletedElement = boardManager.deleteElement(boardId, elementId, userId);
    if (deletedElement) {
      socket.to(boardId).emit('element:deleted', elementId);
    }
  });

  socket.on('board:undo', ({ boardId, userId }: { boardId: string; userId: string }) => {
    const op = boardManager.undo(boardId, userId);
    if (op) {
      io.to(boardId).emit('board:undone', { operation: op, userId });
    }
  });

  socket.on('board:redo', ({ boardId, userId }: { boardId: string; userId: string }) => {
    const op = boardManager.redo(boardId, userId);
    if (op) {
      io.to(boardId).emit('board:redone', { operation: op, userId });
    }
  });

  socket.on('cursor:move', ({ boardId, userId, x, y }: { boardId: string; userId: string; x: number; y: number }) => {
    socket.to(boardId).emit('cursor:moved', { userId, x, y });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    const user = userManager.getUserBySocketId(socket.id);

    if (user && user.boardId) {
      const boardId = user.boardId;
      userManager.leaveBoard(user.id);
      io.to(boardId).emit('user:left', user);
      const remainingUsers = userManager.getBoardUsers(boardId);
      io.to(boardId).emit('users:list', remainingUsers);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
