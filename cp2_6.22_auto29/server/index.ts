import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Idea {
  id: string;
  title: string;
  description: string;
  author: string;
  voteCount: number;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

interface UserVote {
  userName: string;
  votesUsed: number;
}

const ideas: Idea[] = [];
const userVotes: UserVote[] = [];

const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan'];

function getPriority(voteCount: number): 'high' | 'medium' | 'low' {
  if (voteCount >= 10) return 'high';
  if (voteCount >= 5) return 'medium';
  return 'low';
}

function updatePriorities() {
  ideas.forEach((idea) => {
    idea.priority = getPriority(idea.voteCount);
  });
}

app.get('/api/users', (_req, res) => {
  res.json(users);
});

app.post('/api/ideas', (req, res) => {
  const { title, description, author } = req.body;
  if (!title || !description || !author) {
    res.status(400).json({ error: '标题、描述和作者均为必填' });
    return;
  }
  if (title.length > 30) {
    res.status(400).json({ error: '标题最多30字' });
    return;
  }
  if (description.length > 200) {
    res.status(400).json({ error: '描述最多200字' });
    return;
  }
  const newIdea: Idea = {
    id: uuidv4(),
    title,
    description,
    author,
    voteCount: 0,
    createdAt: new Date().toISOString(),
    priority: 'low',
  };
  ideas.unshift(newIdea);
  res.status(201).json(newIdea);
});

app.get('/api/ideas', (_req, res) => {
  updatePriorities();
  res.json(ideas);
});

app.post('/api/ideas/:id/vote', (req, res) => {
  const { id } = req.params;
  const { userName } = req.body;
  if (!userName) {
    res.status(400).json({ error: '用户名必填' });
    return;
  }
  let userVote = userVotes.find((uv) => uv.userName === userName);
  if (!userVote) {
    userVote = { userName, votesUsed: 0 };
    userVotes.push(userVote);
  }
  if (userVote.votesUsed >= 5) {
    res.status(403).json({ error: '已达投票上限5票' });
    return;
  }
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    res.status(404).json({ error: '创意不存在' });
    return;
  }
  idea.voteCount += 1;
  idea.priority = getPriority(idea.voteCount);
  userVote.votesUsed += 1;
  res.json({ idea, votesRemaining: 5 - userVote.votesUsed });
});

app.get('/api/ideas/ranked', (_req, res) => {
  updatePriorities();
  const sorted = [...ideas].sort((a, b) => b.voteCount - a.voteCount);
  res.json(sorted);
});

app.patch('/api/ideas/:id/priority', (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  if (!['high', 'medium', 'low'].includes(priority)) {
    res.status(400).json({ error: '无效的优先级' });
    return;
  }
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    res.status(404).json({ error: '创意不存在' });
    return;
  }
  idea.priority = priority;
  res.json(idea);
});

app.get('/api/votes/:userName', (req, res) => {
  const { userName } = req.params;
  const userVote = userVotes.find((uv) => uv.userName === userName);
  res.json({ votesUsed: userVote?.votesUsed || 0, votesRemaining: 5 - (userVote?.votesUsed || 0) });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
