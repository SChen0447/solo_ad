import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.set('trust proxy', true);
app.use(express.json());

function normalizeClientIp(ip: string | undefined, socketAddr: string | undefined): string {
  let clientIp = ip || socketAddr || 'unknown';
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }
  return clientIp;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  deadline: number;
  createdAt: number;
  totalVotes: number;
  votedIps: Set<string>;
}

const polls = new Map<string, Poll>();

interface CreatePollRequest {
  title: string;
  options: string[];
  deadline: number;
}

app.post('/api/polls', (req: Request, res: Response) => {
  const { title, options, deadline }: CreatePollRequest = req.body;

  if (!title || !options || !Array.isArray(options) || options.length < 2 || options.length > 8) {
    return res.status(400).json({ error: '标题必填，选项数量需在2-8个之间' });
  }

  if (!deadline || deadline <= Date.now()) {
    return res.status(400).json({ error: '截止时间必须大于当前时间' });
  }

  const pollId = uuidv4();
  const poll: Poll = {
    id: pollId,
    title,
    options: options.map((text) => ({
      id: uuidv4(),
      text,
      votes: 0
    })),
    deadline,
    createdAt: Date.now(),
    totalVotes: 0,
    votedIps: new Set<string>()
  };

  polls.set(pollId, poll);

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    deadline: poll.deadline,
    createdAt: poll.createdAt,
    totalVotes: poll.totalVotes
  });
});

app.get('/api/polls/:id', (req: Request, res: Response) => {
  const poll = polls.get(req.params.id);

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }

  const isExpired = Date.now() >= poll.deadline;

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    deadline: poll.deadline,
    createdAt: poll.createdAt,
    totalVotes: poll.totalVotes,
    isExpired
  });
});

interface VoteRequest {
  optionId: string;
}

app.post('/api/polls/:id/vote', (req: Request, res: Response) => {
  const poll = polls.get(req.params.id);

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }

  if (Date.now() >= poll.deadline) {
    return res.status(400).json({ error: '投票已结束' });
  }

  const { optionId }: VoteRequest = req.body;
  const clientIp = normalizeClientIp(req.ip, req.socket.remoteAddress);

  if (poll.votedIps.has(clientIp)) {
    return res.status(400).json({ error: '您已投过票' });
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }

  option.votes += 1;
  poll.totalVotes += 1;
  poll.votedIps.add(clientIp);

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    deadline: poll.deadline,
    createdAt: poll.createdAt,
    totalVotes: poll.totalVotes,
    isExpired: false
  });
});

app.listen(PORT, () => {
  console.log(`Vote server running on http://localhost:${PORT}`);
});
