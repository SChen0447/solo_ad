import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { User, Session, Task } from './types';
import * as boardManager from './boardManager';
import * as notificationManager from './notificationManager';

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

const users = new Map<string, User>();
const sessions = new Map<string, string>();
const boardSubscriptions = new Map<string, Set<string>>();
const socketToUser = new Map<string, string>();

const avatarColors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#f472b6'];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getUserFromRequest(req: Request): User | null {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) return null;
  
  const userId = sessions.get(sessionId);
  if (!userId) return null;
  
  return users.get(userId) || null;
}

function getBoardIdFromTaskId(taskId: string): string | null {
  for (const [boardId, _] of boardSubscriptions) {
    const board = boardManager.getBoard(boardId);
    if (board && board.tasks.some(t => t.id === taskId)) {
      return boardId;
    }
  }
  return null;
}

const demoUsers: User[] = [
  { id: uuidv4(), username: '张三', avatar: '', online: false },
  { id: uuidv4(), username: '李四', avatar: '', online: false },
  { id: uuidv4(), username: '王五', avatar: '', online: false },
  { id: uuidv4(), username: '赵六', avatar: '', online: false },
  { id: uuidv4(), username: '钱七', avatar: '', online: false },
];

demoUsers.forEach(user => {
  user.avatar = getAvatarColor(user.username);
  users.set(user.id, user);
});

boardManager.initializeDemoData(demoUsers);

app.post('/api/login', (req: Request, res: Response) => {
  const { username } = req.body;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  
  let user = Array.from(users.values()).find(u => u.username === username);
  
  if (!user) {
    user = {
      id: uuidv4(),
      username,
      avatar: getAvatarColor(username),
      online: true,
    };
    users.set(user.id, user);
  } else {
    user.online = true;
  }
  
  const sessionId = uuidv4();
  sessions.set(sessionId, user.id);
  
  res.json({ user, sessionId });
});

app.get('/api/users', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  res.json(Array.from(users.values()));
});

app.get('/api/boards', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const boards = boardManager.getUserBoards(user.id);
  res.json(boards);
});

app.post('/api/boards', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const { name, memberIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: '看板名称不能为空' });
  }
  
  const members: User[] = [user];
  if (memberIds && Array.isArray(memberIds)) {
    memberIds.forEach(id => {
      const member = users.get(id);
      if (member && member.id !== user.id) {
        members.push(member);
      }
    });
  }
  
  const board = boardManager.createBoard(name, members);
  res.json(board);
});

app.get('/api/boards/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const board = boardManager.getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: '看板不存在' });
  }
  
  if (!board.members.some(m => m.id === user.id)) {
    return res.status(403).json({ error: '没有权限访问该看板' });
  }
  
  res.json(board);
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const { laneId, order, assignee, ...updates } = req.body;
  const taskId = req.params.id;
  const boardId = getBoardIdFromTaskId(taskId);
  
  if (!boardId) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  let task: Task | null;
  
  if (laneId !== undefined && order !== undefined) {
    task = boardManager.moveTask(boardId, taskId, laneId, order);
    if (task) {
      io.to(boardId).emit('taskMoved', {
        taskId,
        laneId,
        order,
      });
      io.to(boardId).emit('taskUpdated', task);
    }
  } else {
    task = boardManager.updateTask(boardId, taskId, updates);
    
    if (task && assignee && assignee.id && assignee.id !== task.assignee?.id) {
      task = boardManager.updateTask(boardId, taskId, { assignee });
      if (task) {
        const notification = notificationManager.createAssignmentNotification(
          user,
          assignee.id,
          task
        );
        const userSocketId = Array.from(socketToUser.entries())
          .find(([_, uid]) => uid === assignee.id)?.[0];
        if (userSocketId) {
          io.to(userSocketId).emit('notification', notification);
        }
      }
    }
    
    if (task) {
      io.to(boardId).emit('taskUpdated', task);
    }
  }
  
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.json(task);
});

app.post('/api/tasks/:id/comments', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const { content, mentions } = req.body;
  const taskId = req.params.id;
  const boardId = getBoardIdFromTaskId(taskId);
  
  if (!boardId) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  const task = boardManager.addComment(boardId, taskId, content, user, mentions || []);
  
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  const allUsers = Array.from(users.values());
  const notifications = notificationManager.processMentions(content, user, task, allUsers);
  
  notifications.forEach(notification => {
    const userSocketId = Array.from(socketToUser.entries())
      .find(([_, uid]) => uid === notification.toUserId)?.[0];
    if (userSocketId) {
      io.to(userSocketId).emit('notification', notification);
    }
  });
  
  io.to(boardId).emit('taskUpdated', task);
  res.json(task);
});

app.get('/api/notifications', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const notifications = notificationManager.getUserNotifications(user.id);
  res.json(notifications.slice(0, 50));
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const notification = notificationManager.markNotificationRead(user.id, req.params.id);
  if (!notification) {
    return res.status(404).json({ error: '通知不存在' });
  }
  
  res.json(notification);
});

io.on('connection', (socket) => {
  socket.on('joinBoard', ({ boardId, userId }) => {
    const sockets = boardSubscriptions.get(boardId) || new Set();
    sockets.add(socket.id);
    boardSubscriptions.set(boardId, sockets);
    socket.join(boardId);
    
    if (userId) {
      socketToUser.set(socket.id, userId);
      const user = users.get(userId);
      if (user) {
        user.online = true;
        io.to(boardId).emit('userPresence', { userId, online: true });
      }
    }
  });
  
  socket.on('leaveBoard', ({ boardId, userId }) => {
    const sockets = boardSubscriptions.get(boardId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        boardSubscriptions.delete(boardId);
      }
    }
    socket.leave(boardId);
    
    if (userId) {
      socketToUser.delete(socket.id);
      const user = users.get(userId);
      if (user) {
        user.online = false;
        io.emit('userPresence', { userId, online: false });
      }
    }
  });
  
  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const user = users.get(userId);
      if (user) {
        user.online = false;
        io.emit('userPresence', { userId, online: false });
      }
      socketToUser.delete(socket.id);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}/api`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
