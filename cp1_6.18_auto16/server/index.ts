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

interface Poll {
  id: string;
  topic: string;
  options: VoteOption[];
  adminToken: string;
  voters: Set<string>;
  onlineUsers: Set<string>;
  isDestroyed: boolean;
  createdAt: number;
}

const polls = new Map<string, Poll>();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

function generateAdminToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getPollPublicData(poll: Poll) {
  return {
    id: poll.id,
    topic: poll.topic,
    options: poll.options,
    onlineCount: poll.onlineUsers.size,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
    isDestroyed: poll.isDestroyed,
  };
}

app.get('/api/poll/:id', (req: Request, res: Response) => {
  const poll = polls.get(req.params.id);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }
  res.json(getPollPublicData(poll));
});

app.post('/api/poll', (req: Request, res: Response) => {
  const { topic, options } = req.body;

  if (!topic || typeof topic !== 'string' || topic.length > 50) {
    return res.status(400).json({ error: '议题不能为空且不超过50字' });
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    return res.status(400).json({ error: '选项数量应在2到10之间' });
  }

  const validOptions = options.filter(
    (opt: unknown) => typeof opt === 'string' && opt.trim().length > 0,
  );

  if (validOptions.length < 2) {
    return res.status(400).json({ error: '选项内容不能为空' });
  }

  const pollId = uuidv4();
  const adminToken = generateAdminToken();

  const poll: Poll = {
    id: pollId,
    topic,
    options: validOptions.map((text) => ({
      id: uuidv4(),
      text: text as string,
      votes: 0,
    })),
    adminToken,
    voters: new Set(),
    onlineUsers: new Set(),
    isDestroyed: false,
    createdAt: Date.now(),
  };

  polls.set(pollId, poll);

  res.json({
    ...getPollPublicData(poll),
    adminToken,
  });
});

io.on('connection', (socket) => {
  let currentPollId: string | null = null;
  let currentClientId: string | null = null;

  socket.on('joinPoll', ({ pollId, clientId }) => {
    const poll = polls.get(pollId);
    if (!poll) {
      socket.emit('error', { message: '投票不存在' });
      return;
    }

    currentPollId = pollId;
    currentClientId = clientId;

    poll.onlineUsers.add(clientId);
    socket.join(pollId);

    io.to(pollId).emit('onlineUpdate', {
      onlineCount: poll.onlineUsers.size,
    });

    socket.emit('pollData', getPollPublicData(poll));
  });

  socket.on('submitVote', ({ pollId, optionId, clientId }) => {
    const poll = polls.get(pollId);
    if (!poll) {
      socket.emit('error', { message: '投票不存在' });
      return;
    }

    if (poll.isDestroyed) {
      socket.emit('error', { message: '该投票已被关闭' });
      return;
    }

    if (poll.voters.has(clientId)) {
      socket.emit('error', { message: '您已经投过票了' });
      return;
    }

    const option = poll.options.find((opt) => opt.id === optionId);
    if (!option) {
      socket.emit('error', { message: '选项不存在' });
      return;
    }

    option.votes += 1;
    poll.voters.add(clientId);

    io.to(pollId).emit('voteUpdate', getPollPublicData(poll));
    socket.emit('voted', { optionId });
  });

  socket.on('resetPoll', ({ pollId, adminToken }) => {
    const poll = polls.get(pollId);
    if (!poll) {
      socket.emit('error', { message: '投票不存在' });
      return;
    }

    if (poll.adminToken !== adminToken) {
      socket.emit('error', { message: '管理员令牌无效' });
      return;
    }

    poll.options.forEach((opt) => (opt.votes = 0));
    poll.voters.clear();

    io.to(pollId).emit('voteUpdate', getPollPublicData(poll));
    io.to(pollId).emit('pollReset');
  });

  socket.on('destroyPoll', ({ pollId, adminToken }) => {
    const poll = polls.get(pollId);
    if (!poll) {
      socket.emit('error', { message: '投票不存在' });
      return;
    }

    if (poll.adminToken !== adminToken) {
      socket.emit('error', { message: '管理员令牌无效' });
      return;
    }

    poll.isDestroyed = true;
    io.to(pollId).emit('pollDestroyed');
  });

  socket.on('disconnect', () => {
    if (currentPollId && currentClientId) {
      const poll = polls.get(currentPollId);
      if (poll) {
        poll.onlineUsers.delete(currentClientId);
        io.to(currentPollId).emit('onlineUpdate', {
          onlineCount: poll.onlineUsers.size,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
