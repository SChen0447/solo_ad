import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './roomManager';
import { createAudioUploadMiddleware, handleAudioUpload } from './audioFileHandler';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();
const uploadsDir = path.join(process.cwd(), 'uploads');
const uploadMiddleware = createAudioUploadMiddleware(uploadsDir);

app.use('/uploads', express.static(uploadsDir));

const projects = new Map<string, any>();

app.post('/api/projects', (req, res) => {
  const { id, name, ownerId, bpm, timeSignature, tracks } = req.body;
  const project = {
    id: id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name || 'Untitled Project',
    ownerId: ownerId || 'anonymous',
    bpm: bpm || 120,
    timeSignature: timeSignature || [4, 4],
    tracks: tracks || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(project.id, project);
  res.json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const updated = { ...project, ...req.body, updatedAt: Date.now() };
  projects.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/upload/:projectId', uploadMiddleware.single('audio'), handleAudioUpload);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string || `user_${Date.now()}`;
  const userName = socket.handshake.query.userName as string || `User_${userId.slice(0, 4)}`;

  socket.on('join-project', (data: { projectId: string; userId: string; userName: string }) => {
    const { projectId, userId, userName } = data;
    socket.join(projectId);

    const user = roomManager.addUser(projectId, {
      id: userId,
      name: userName,
      color: roomManager.getUserColor(projectId, userId),
      role: roomManager.isOwner(projectId, userId) ? 'owner' : 'collaborator',
      socketId: socket.id,
    });

    const users = roomManager.getUsers(projectId).map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      role: u.role,
    }));

    socket.emit('project-users', users);
    socket.to(projectId).emit('user-joined', { user: { id: user.id, name: user.name, color: user.color, role: user.role } });
  });

  socket.on('edit-operation', (data: { projectId: string; operation: any; userId: string }) => {
    const { projectId, operation, userId } = data;
    const user = roomManager.getUser(projectId, userId);
    if (!user) return;

    const userColor = user.color;
    const broadcastOp = { ...operation, userColor };

    socket.to(projectId).emit('remote-operation', {
      operation: broadcastOp,
      user: { id: user.id, name: user.name, color: userColor, role: user.role },
    });
  });

  socket.on('leave-project', (data: { projectId: string; userId: string }) => {
    const { projectId, userId } = data;
    roomManager.removeUser(projectId, userId);
    socket.to(projectId).emit('user-left', { userId });
    socket.leave(projectId);
  });

  socket.on('disconnect', () => {
    const userProjects = roomManager.getUserProjects(socket.id);
    for (const projectId of userProjects) {
      const removedUser = roomManager.removeUserBySocketId(projectId, socket.id);
      if (removedUser) {
        socket.to(projectId).emit('user-left', { userId: removedUser.id });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎵 Music Collab Studio server running on port ${PORT}`);
});
