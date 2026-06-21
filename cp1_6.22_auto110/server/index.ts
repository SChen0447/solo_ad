import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  nickname: string;
  avatar: string;
}

interface Team {
  id: string;
  name: string;
  tags: string[];
  maxMembers: number;
  members: User[];
  creatorId: string;
  createdAt: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  text: string;
  timestamp: number;
  teamId: string;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

let teams: Team[] = [];
let messages: ChatMessage[] = [];

const DEFAULT_NICKNAMES = ['运动达人', '学霸君', '游戏高手', '图书馆常客', '羽毛球爱好者', '学习小能手', '夜猫子', '刷题狂人'];
const getRandomNickname = () => DEFAULT_NICKNAMES[Math.floor(Math.random() * DEFAULT_NICKNAMES.length)];

app.get('/api/teams', (req: Request, res: Response) => {
  const sortedTeams = [...teams].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sortedTeams);
});

app.post('/api/teams', (req: Request, res: Response) => {
  const { name, tags, maxMembers, creatorNickname } = req.body;
  
  if (!name || !tags || !maxMembers) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const creatorId = uuidv4();
  const newTeam: Team = {
    id: uuidv4(),
    name,
    tags,
    maxMembers,
    members: [{
      id: creatorId,
      nickname: creatorNickname || getRandomNickname(),
      avatar: '#a0aec0'
    }],
    creatorId,
    createdAt: Date.now()
  };

  teams.push(newTeam);
  res.status(201).json(newTeam);
});

app.get('/api/teams/:id', (req: Request, res: Response) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: '小队不存在' });
  }
  const teamMessages = messages.filter(m => m.teamId === team.id);
  res.json({ team, messages: teamMessages });
});

io.on('connection', (socket: Socket) => {
  let currentUserId: string | null = null;
  let currentTeamId: string | null = null;
  let currentNickname: string | null = null;

  socket.on('join-room', ({ teamId, nickname }: { teamId: string; nickname?: string }) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      socket.emit('error', { message: '小队不存在' });
      return;
    }

    const userId = uuidv4();
    const userNickname = nickname || getRandomNickname();
    const user: User = {
      id: userId,
      nickname: userNickname,
      avatar: '#a0aec0'
    };

    if (team.members.length >= team.maxMembers) {
      socket.emit('error', { message: '小队已满' });
      return;
    }

    team.members.push(user);
    currentUserId = userId;
    currentTeamId = teamId;
    currentNickname = userNickname;

    socket.join(teamId);

    io.to(teamId).emit('user-joined', { user, members: team.members });
    socket.emit('joined', { userId, nickname: userNickname, team });
  });

  socket.on('send-message', ({ teamId, text }: { teamId: string; text: string }) => {
    if (!currentUserId || !currentNickname) return;

    const message: ChatMessage = {
      id: uuidv4(),
      userId: currentUserId,
      nickname: currentNickname,
      avatar: '#a0aec0',
      text,
      timestamp: Date.now(),
      teamId
    };

    messages.push(message);
    io.to(teamId).emit('receive-message', message);
  });

  socket.on('leave-room', () => {
    if (!currentTeamId || !currentUserId) return;

    const team = teams.find(t => t.id === currentTeamId);
    if (team) {
      team.members = team.members.filter(m => m.id !== currentUserId);
      io.to(currentTeamId).emit('user-left', { userId: currentUserId, members: team.members });
    }

    socket.leave(currentTeamId);
    currentUserId = null;
    currentTeamId = null;
    currentNickname = null;
  });

  socket.on('disband-team', () => {
    if (!currentTeamId || !currentUserId) return;

    const team = teams.find(t => t.id === currentTeamId);
    if (team && team.creatorId === currentUserId) {
      io.to(currentTeamId).emit('team-disbanded');
      teams = teams.filter(t => t.id !== currentTeamId);
      messages = messages.filter(m => m.teamId !== currentTeamId);
    }
  });

  socket.on('disconnect', () => {
    if (currentTeamId && currentUserId) {
      const team = teams.find(t => t.id === currentTeamId);
      if (team) {
        team.members = team.members.filter(m => m.id !== currentUserId);
        io.to(currentTeamId).emit('user-left', { userId: currentUserId, members: team.members });
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
