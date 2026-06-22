import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface VoteOption {
  id: string;
  text: string;
  votes: string[];
}

interface Poll {
  id: string;
  code: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  isClosed: boolean;
  creatorId: string;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const polls: Map<string, Poll> = new Map();
const pollCodeToId: Map<string, string> = new Map();

function generatePollCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateUniquePollCode(): string {
  let code = generatePollCode();
  while (pollCodeToId.has(code)) {
    code = generatePollCode();
  }
  return code;
}

app.post('/api/polls', (req, res) => {
  const { title, options } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: '投票标题不能为空' });
  }
  if (!options || options.length < 2 || options.length > 8) {
    return res.status(400).json({ error: '选项数量必须在2到8之间' });
  }
  for (const opt of options) {
    if (!opt || !opt.trim()) {
      return res.status(400).json({ error: '选项内容不能为空' });
    }
  }

  const pollId = uuidv4();
  const pollCode = generateUniquePollCode();
  const creatorId = uuidv4();

  const poll: Poll = {
    id: pollId,
    code: pollCode,
    title: title.trim(),
    options: options.map((text: string, index: number) => ({
      id: `opt_${index}_${uuidv4().slice(0, 8)}`,
      text: text.trim(),
      votes: [],
    })),
    createdAt: Date.now(),
    isClosed: false,
    creatorId,
  };

  polls.set(pollId, poll);
  pollCodeToId.set(pollCode, pollId);

  return res.status(201).json({
    id: pollId,
    code: pollCode,
    title: poll.title,
    options: poll.options.map(o => ({ id: o.id, text: o.text })),
    createdAt: poll.createdAt,
    isClosed: poll.isClosed,
    creatorId,
  });
});

app.get('/api/polls/:code', (req, res) => {
  const { code } = req.params;
  const pollId = pollCodeToId.get(code.toUpperCase());

  if (!pollId) {
    return res.status(404).json({ error: '投票不存在' });
  }

  const poll = polls.get(pollId)!;
  return res.json({
    id: poll.id,
    code: poll.code,
    title: poll.title,
    options: poll.options.map(o => ({
      id: o.id,
      text: o.text,
      voteCount: o.votes.length,
    })),
    totalVotes: poll.options.reduce((sum, o) => sum + o.votes.length, 0),
    isClosed: poll.isClosed,
  });
});

app.get('/api/polls/:code/details', (req, res) => {
  const { code } = req.params;
  const { creatorId } = req.query;
  const pollId = pollCodeToId.get(code.toUpperCase());

  if (!pollId) {
    return res.status(404).json({ error: '投票不存在' });
  }

  const poll = polls.get(pollId)!;
  const isCreator = creatorId === poll.creatorId;

  return res.json({
    id: poll.id,
    code: poll.code,
    title: poll.title,
    totalVotes: poll.options.reduce((sum, o) => sum + o.votes.length, 0),
    isClosed: poll.isClosed,
    isCreator,
    options: poll.options.map((o, idx) => ({
      id: o.id,
      text: o.text,
      voteCount: o.votes.length,
      voters: isCreator ? o.votes.map((_, i) => `参与者${i + 1}`) : undefined,
    })),
  });
});

io.on('connection', (socket: Socket) => {
  let currentPollId: string | null = null;

  socket.on('join_poll', (code: string) => {
    const pollId = pollCodeToId.get(code.toUpperCase());
    if (pollId) {
      if (currentPollId) {
        socket.leave(`poll:${currentPollId}`);
      }
      currentPollId = pollId;
      socket.join(`poll:${pollId}`);
      const poll = polls.get(pollId)!;
      socket.emit('poll_update', {
        id: poll.id,
        code: poll.code,
        title: poll.title,
        options: poll.options.map(o => ({
          id: o.id,
          text: o.text,
          voteCount: o.votes.length,
        })),
        totalVotes: poll.options.reduce((sum, o) => sum + o.votes.length, 0),
        isClosed: poll.isClosed,
      });
    }
  });

  socket.on('vote', (data: { code: string; optionId: string; voterId: string }) => {
    const pollId = pollCodeToId.get(data.code.toUpperCase());
    if (!pollId) return;

    const poll = polls.get(pollId)!;
    if (poll.isClosed) return;

    let alreadyVoted = false;
    for (const opt of poll.options) {
      if (opt.votes.includes(data.voterId)) {
        alreadyVoted = true;
        break;
      }
    }

    if (!alreadyVoted) {
      const option = poll.options.find(o => o.id === data.optionId);
      if (option) {
        option.votes.push(data.voterId);
        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
        io.to(`poll:${pollId}`).emit('poll_update', {
          id: poll.id,
          code: poll.code,
          title: poll.title,
          options: poll.options.map(o => ({
            id: o.id,
            text: o.text,
            voteCount: o.votes.length,
          })),
          totalVotes,
          isClosed: poll.isClosed,
        });
      }
    }
  });

  socket.on('reset_poll', (data: { code: string; creatorId: string }) => {
    const pollId = pollCodeToId.get(data.code.toUpperCase());
    if (!pollId) return;

    const poll = polls.get(pollId)!;
    if (poll.creatorId !== data.creatorId) return;

    for (const opt of poll.options) {
      opt.votes = [];
    }
    poll.isClosed = false;

    io.to(`poll:${pollId}`).emit('poll_update', {
      id: poll.id,
      code: poll.code,
      title: poll.title,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        voteCount: o.votes.length,
      })),
      totalVotes: 0,
      isClosed: poll.isClosed,
    });
  });

  socket.on('close_poll', (data: { code: string; creatorId: string }) => {
    const pollId = pollCodeToId.get(data.code.toUpperCase());
    if (!pollId) return;

    const poll = polls.get(pollId)!;
    if (poll.creatorId !== data.creatorId) return;

    poll.isClosed = true;

    io.to(`poll:${pollId}`).emit('poll_update', {
      id: poll.id,
      code: poll.code,
      title: poll.title,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        voteCount: o.votes.length,
      })),
      totalVotes: poll.options.reduce((sum, o) => sum + o.votes.length, 0),
      isClosed: poll.isClosed,
    });
  });

  socket.on('leave_poll', () => {
    if (currentPollId) {
      socket.leave(`poll:${currentPollId}`);
      currentPollId = null;
    }
  });

  socket.on('disconnect', () => {
    if (currentPollId) {
      socket.leave(`poll:${currentPollId}`);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`LunchVote server running on port ${PORT}`);
});
