import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

interface Vote {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  isClosed: boolean;
  createdAt: number;
  creatorId: string;
}

interface CreateVoteRequest {
  title: string;
  description: string;
  options: string[];
}

interface CastVoteRequest {
  optionId: string;
  voterId: string;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const votes = new Map<string, Vote>();
const voterHistory = new Map<string, Set<string>>();

app.post('/api/votes', (req: Request<{}, {}, CreateVoteRequest>, res: Response) => {
  try {
    const { title, description, options } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '投票标题不能为空' });
    }

    if (!options || options.length < 2 || options.length > 6) {
      return res.status(400).json({ error: '选项数量必须在2-6个之间' });
    }

    const voteId = uuidv4();
    const creatorId = uuidv4();

    const vote: Vote = {
      id: voteId,
      title: title.trim(),
      description: description?.trim() || '',
      options: options.map(text => ({
        id: uuidv4(),
        text: text.trim(),
        votes: 0
      })),
      isClosed: false,
      createdAt: Date.now(),
      creatorId
    };

    votes.set(voteId, vote);
    io.emit('voteCreated', vote);

    return res.status(201).json({ vote, creatorId });
  } catch (error) {
    console.error('创建投票失败:', error);
    return res.status(500).json({ error: '创建投票失败' });
  }
});

app.get('/api/votes', (_req: Request, res: Response) => {
  const voteList = Array.from(votes.values()).sort((a, b) => b.createdAt - a.createdAt);
  return res.json(voteList);
});

app.get('/api/votes/:id', (req: Request<{ id: string }>, res: Response) => {
  const vote = votes.get(req.params.id);

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }

  return res.json(vote);
});

app.post('/api/votes/:id/vote', (req: Request<{ id: string }, {}, CastVoteRequest>, res: Response) => {
  const vote = votes.get(req.params.id);
  const { optionId, voterId } = req.body;

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }

  if (vote.isClosed) {
    return res.status(400).json({ error: '投票已关闭' });
  }

  if (!voterId) {
    return res.status(400).json({ error: '缺少voterId' });
  }

  const voterKey = `${vote.id}-${voterId}`;
  if (voterHistory.has(voterKey)) {
    return res.status(400).json({ error: '您已经投过票了' });
  }

  const option = vote.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }

  option.votes += 1;
  voterHistory.set(voterKey, new Set());

  io.emit('voteUpdated', vote);

  return res.json({ success: true, vote });
});

app.post('/api/votes/:id/close', (req: Request<{ id: string }, {}, { creatorId: string }>, res: Response) => {
  const vote = votes.get(req.params.id);
  const { creatorId } = req.body;

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }

  if (vote.creatorId !== creatorId) {
    return res.status(403).json({ error: '无权限关闭此投票' });
  }

  vote.isClosed = true;
  io.emit('voteClosed', vote);

  return res.json({ success: true, vote });
});

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);

  socket.on('joinRoom', (voteId: string) => {
    socket.join(voteId);
    console.log(`客户端 ${socket.id} 加入投票房间: ${voteId}`);
  });

  socket.on('leaveRoom', (voteId: string) => {
    socket.leave(voteId);
    console.log(`客户端 ${socket.id} 离开投票房间: ${voteId}`);
  });

  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`FlashVote 服务器运行在端口 ${PORT}`);
});
