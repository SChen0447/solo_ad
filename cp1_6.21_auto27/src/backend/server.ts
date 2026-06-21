import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { voteEngine, Category, CATEGORIES } from './voteEngine';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/topics', (req, res) => {
  const category = req.query.category as Category | undefined;
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  const topics = voteEngine.getAllTopics(category);
  res.json({ topics });
});

app.get('/api/topics/:id', (req, res) => {
  const topic = voteEngine.getTopic(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const hasVoted = req.query.voterId
    ? voteEngine.hasUserVoted(req.params.id, req.query.voterId as string)
    : false;
  const userVoteId = req.query.voterId
    ? voteEngine.getUserVote(req.params.id, req.query.voterId as string)
    : null;
  res.json({ topic, hasVoted, userVoteId });
});

app.post('/api/topics', (req, res) => {
  const { name, category, deadline } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: '话题名称不能为空' });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: '话题名称不能超过100字' });
  }
  if (!category || !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  if (!deadline || typeof deadline !== 'number') {
    return res.status(400).json({ error: '请设置截止时间' });
  }
  if (deadline <= Date.now()) {
    return res.status(400).json({ error: '截止时间必须在未来' });
  }

  const topic = voteEngine.createTopic(name.trim(), category, deadline);
  io.emit('topic:created', topic);
  res.status(201).json({ topic });
});

app.post('/api/topics/:id/proposals', (req, res) => {
  const { content } = req.body;
  const topicId = req.params.id;

  const topic = voteEngine.getTopic(topicId);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  if (topic.status === 'ended') {
    return res.status(400).json({ error: '投票已结束，无法提交提案' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: '提案内容不能为空' });
  }
  if (content.length > 200) {
    return res.status(400).json({ error: '提案内容不能超过200字' });
  }

  const proposal = voteEngine.addProposal(topicId, content.trim());
  if (!proposal) {
    return res.status(500).json({ error: '提交失败' });
  }

  const updatedTopic = voteEngine.getTopic(topicId)!;
  io.emit('topic:updated', updatedTopic);
  io.emit(`topic:${topicId}:proposal`, proposal);

  res.status(201).json({ proposal });
});

app.post('/api/topics/:id/vote', (req, res) => {
  const { proposalId, voterId } = req.body;
  const topicId = req.params.id;

  if (!proposalId || typeof proposalId !== 'string') {
    return res.status(400).json({ error: '请选择一个提案' });
  }
  if (!voterId || typeof voterId !== 'string') {
    return res.status(400).json({ error: '缺少选民标识' });
  }

  const result = voteEngine.castVote(topicId, proposalId, voterId);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  voteEngine.recordUserVote(topicId, voterId, proposalId);

  const rankings = voteEngine.getRankings(topicId);
  io.emit('topic:updated', result.topic);
  io.emit(`topic:${topicId}:vote`, {
    topic: result.topic,
    rankings,
    proposalId,
  });

  if (result.topic!.status === 'ended') {
    io.emit(`topic:${topicId}:ended`, {
      topic: result.topic,
      rankings,
    });
  }

  res.json({ success: true, topic: result.topic, rankings });
});

app.post('/api/topics/:id/end', (req, res) => {
  const topicId = req.params.id;
  const topic = voteEngine.endTopic(topicId);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }

  const rankings = voteEngine.getRankings(topicId);
  io.emit('topic:updated', topic);
  io.emit(`topic:${topicId}:ended`, { topic, rankings });

  res.json({ topic, rankings });
});

app.get('/api/topics/:id/rankings', (req, res) => {
  const rankings = voteEngine.getRankings(req.params.id);
  if (rankings.length === 0) {
    const topic = voteEngine.getTopic(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: '话题不存在' });
    }
  }
  res.json({ rankings });
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('topic:join', (topicId: string) => {
    socket.join(`topic:${topicId}`);
    const topic = voteEngine.getTopic(topicId);
    if (topic) {
      const rankings = voteEngine.getRankings(topicId);
      socket.emit(`topic:${topicId}:state`, { topic, rankings });
    }
  });

  socket.on('topic:leave', (topicId: string) => {
    socket.leave(`topic:${topicId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

setInterval(() => {
  const allTopics = voteEngine.getAllTopics();
  allTopics.forEach((topic) => {
    if (topic.status === 'active' && Date.now() >= topic.deadline) {
      const updated = voteEngine.endTopic(topic.id);
      if (updated) {
        const rankings = voteEngine.getRankings(topic.id);
        io.emit('topic:updated', updated);
        io.emit(`topic:${topic.id}:ended`, { topic: updated, rankings });
      }
    }
  });
}, 1000);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});
