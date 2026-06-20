import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import { boardStore, Board, Card, Comment, User, CardType, Position, CardData, PRESET_COLORS } from './models/board';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface SocketData {
  boardId: string;
  user: User;
}

const activeUsers = new Map<string, Set<string>>();

app.get('/api/boards', (_req: Request, res: Response) => {
  const boards = boardStore.getAllBoards();
  res.json(boards);
});

app.get('/api/boards/:id', (req: Request, res: Response) => {
  const board = boardStore.getBoard(req.params.id);
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json(board);
});

app.post('/api/boards', (req: Request, res: Response) => {
  const { title, description, backgroundColor } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  const board = boardStore.createBoard(title, description || '', backgroundColor || PRESET_COLORS[0]);
  res.status(201).json(board);
});

app.put('/api/boards/:id', (req: Request, res: Response) => {
  const { title, description, backgroundColor } = req.body;
  const board = boardStore.updateBoard(req.params.id, { title, description, backgroundColor });
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json(board);
});

app.delete('/api/boards/:id', (req: Request, res: Response) => {
  const deleted = boardStore.deleteBoard(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/colors', (_req: Request, res: Response) => {
  res.json(PRESET_COLORS);
});

io.on('connection', (socket: Socket) => {
  const socketData: Partial<SocketData> = {};

  socket.on('join_board', (data: { boardId: string; user: User }) => {
    const board = boardStore.getBoard(data.boardId);
    if (!board) {
      socket.emit('error', { message: 'Board not found' });
      return;
    }
    socketData.boardId = data.boardId;
    socketData.user = data.user;
    socket.join(data.boardId);

    if (!activeUsers.has(data.boardId)) {
      activeUsers.set(data.boardId, new Set());
    }
    activeUsers.get(data.boardId)!.add(data.user.id);

    io.to(data.boardId).emit('user_joined', {
      user: data.user,
      activeUsers: Array.from(activeUsers.get(data.boardId)!),
    });
    socket.emit('board_state', board);
  });

  socket.on('add_card', (data: { type: CardType; position: Position; data: CardData }) => {
    if (!socketData.boardId || !socketData.user) return;
    const card = boardStore.addCard(socketData.boardId, data.type, data.position, data.data);
    if (card) {
      io.to(socketData.boardId).emit('card_added', { card, user: socketData.user });
    }
  });

  socket.on('update_card', (data: { cardId: string; updates: Partial<Pick<Card, 'position' | 'size' | 'data'>> }) => {
    if (!socketData.boardId || !socketData.user) return;
    const card = boardStore.updateCard(socketData.boardId, data.cardId, data.updates);
    if (card) {
      io.to(socketData.boardId).emit('card_updated', { card, user: socketData.user });
    }
  });

  socket.on('delete_card', (data: { cardId: string }) => {
    if (!socketData.boardId || !socketData.user) return;
    const deleted = boardStore.deleteCard(socketData.boardId, data.cardId);
    if (deleted) {
      io.to(socketData.boardId).emit('card_deleted', { cardId: data.cardId, user: socketData.user });
    }
  });

  socket.on('lock_card', (data: { cardId: string }) => {
    if (!socketData.boardId || !socketData.user) return;
    const card = boardStore.lockCard(socketData.boardId, data.cardId, socketData.user);
    if (card) {
      io.to(socketData.boardId).emit('card_locked', { cardId: data.cardId, user: socketData.user });
    }
  });

  socket.on('unlock_card', (data: { cardId: string }) => {
    if (!socketData.boardId) return;
    const card = boardStore.unlockCard(socketData.boardId, data.cardId);
    if (card) {
      io.to(socketData.boardId).emit('card_unlocked', { cardId: data.cardId });
    }
  });

  socket.on('add_comment', (data: { cardId: string; content: string }) => {
    if (!socketData.boardId || !socketData.user) return;
    const comment = boardStore.addComment(socketData.boardId, data.cardId, socketData.user, data.content);
    if (comment) {
      io.to(socketData.boardId).emit('comment_added', { comment });
    }
  });

  socket.on('get_comments', (data: { cardId: string }, callback: (comments: Comment[]) => void) => {
    if (!socketData.boardId) return;
    const comments = boardStore.getComments(socketData.boardId, data.cardId);
    callback(comments);
  });

  socket.on('disconnect', () => {
    if (socketData.boardId && socketData.user) {
      const users = activeUsers.get(socketData.boardId);
      if (users) {
        users.delete(socketData.user.id);
        if (users.size === 0) {
          activeUsers.delete(socketData.boardId);
        } else {
          io.to(socketData.boardId).emit('user_left', {
            user: socketData.user,
            activeUsers: Array.from(users),
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
