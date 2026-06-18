import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import type {
  Poll,
  CreatePollRequest,
  SubmitVoteRequest,
  PollResult,
} from '../src/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

const polls: Map<string, Poll> = new Map();

const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const toPollResult = (poll: Poll): PollResult => ({
  id: poll.id,
  title: poll.title,
  options: poll.options,
  totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
  isClosed: poll.isClosed,
  isMultiSelect: poll.isMultiSelect,
  deadline: poll.deadline,
  voteHistory: poll.voteHistory,
});

const checkPollExpired = (poll: Poll): boolean => {
  if (poll.isClosed) return true;
  if (poll.deadline && Date.now() > poll.deadline) {
    poll.isClosed = true;
    return true;
  }
  return false;
};

app.get('/api/polls', (_req, res) => {
  const allPolls = Array.from(polls.values()).map((poll) => {
    checkPollExpired(poll);
    return toPollResult(poll);
  });
  res.json(allPolls);
});

app.get('/api/polls/:id', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }
  checkPollExpired(poll);
  res.json(toPollResult(poll));
});

app.post('/api/polls', (req, res) => {
  const body: CreatePollRequest = req.body;

  if (!body.title || body.title.trim().length === 0 || body.title.length > 50) {
    return res.status(400).json({ error: '标题不能为空且不超过50字' });
  }

  if (!body.options || body.options.length < 2) {
    return res.status(400).json({ error: '至少需要2个选项' });
  }

  for (const opt of body.options) {
    if (!opt || opt.trim().length === 0 || opt.length > 30) {
      return res.status(400).json({ error: '每个选项不能为空且不超过30字' });
    }
  }

  const poll: Poll = {
    id: uuidv4(),
    title: body.title.trim(),
    options: body.options.map((text) => ({
      id: uuidv4(),
      text: text.trim(),
      votes: 0,
    })),
    createdAt: Date.now(),
    deadline: body.deadline,
    isClosed: false,
    isMultiSelect: body.isMultiSelect || false,
    votedIps: [],
    voteHistory: [],
  };

  polls.set(poll.id, poll);
  io.emit('pollCreated', toPollResult(poll));
  res.status(201).json(toPollResult(poll));
});

app.post('/api/polls/:id/vote', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }

  if (checkPollExpired(poll)) {
    return res.status(400).json({ error: '投票已结束' });
  }

  const body: SubmitVoteRequest = req.body;
  if (!body.optionIds || body.optionIds.length === 0) {
    return res.status(400).json({ error: '请选择至少一个选项' });
  }

  if (!poll.isMultiSelect && body.optionIds.length > 1) {
    return res.status(400).json({ error: '该投票为单选' });
  }

  const ip = getClientIp(req);
  if (poll.votedIps.includes(ip)) {
    return res.status(400).json({ error: '您已经投过票了' });
  }

  for (const optionId of body.optionIds) {
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      return res.status(400).json({ error: '选项不存在' });
    }
  }

  for (const optionId of body.optionIds) {
    const option = poll.options.find((o) => o.id === optionId)!;
    option.votes += 1;
    poll.voteHistory.push({
      timestamp: Date.now(),
      optionId,
      pollId: poll.id,
    });
  }
  poll.votedIps.push(ip);

  const result = toPollResult(poll);
  io.emit('result', result);
  res.json(result);
});

app.post('/api/polls/:id/close', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }
  poll.isClosed = true;
  const result = toPollResult(poll);
  io.emit('result', result);
  res.json(result);
});

app.get('/api/polls/:id/export', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  let csv = '选项,得票数,得票率\n';
  for (const opt of poll.options) {
    const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(2) + '%' : '0%';
    csv += `"${opt.text}",${opt.votes},${percentage}\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="poll-${poll.id}.csv"`);
  res.send('\uFEFF' + csv);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinPoll', (pollId: string) => {
    socket.join(pollId);
    const poll = polls.get(pollId);
    if (poll) {
      socket.emit('result', toPollResult(poll));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
