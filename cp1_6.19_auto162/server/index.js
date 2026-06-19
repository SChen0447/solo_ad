import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const IDEAS_FILE = path.join(__dirname, 'data', 'ideas.json');
const VOTES_FILE = path.join(__dirname, 'data', 'votes.json');

app.use(cors());
app.use(bodyParser.json());

const readJSON = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/ideas', (_req, res) => {
  const data = readJSON(IDEAS_FILE);
  const ideas = (data.ideas || []).sort((a, b) => a.order - b.order);
  res.json(ideas);
});

app.post('/api/ideas', (req, res) => {
  const { title, description, author } = req.body;
  if (!title || !description || !author) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const data = readJSON(IDEAS_FILE);
  const ideas = data.ideas || [];
  const newIdea = {
    id: uuidv4(),
    title,
    description,
    author,
    likes: 0,
    liked: false,
    comments: [],
    order: 0,
    createdAt: Date.now(),
  };
  ideas.forEach((idea) => { idea.order += 1; });
  ideas.unshift(newIdea);
  writeJSON(IDEAS_FILE, { ideas });
  res.status(201).json(newIdea);
});

app.put('/api/ideas/:id', (req, res) => {
  const { id } = req.params;
  const { order, orders } = req.body;
  const data = readJSON(IDEAS_FILE);
  const ideas = data.ideas || [];

  if (orders && Array.isArray(orders)) {
    orders.forEach(({ id: oid, order: oorder }) => {
      const idea = ideas.find((i) => i.id === oid);
      if (idea) idea.order = oorder;
    });
  } else {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) {
      return res.status(404).json({ error: '创意不存在' });
    }
    if (order !== undefined) idea.order = order;
  }

  writeJSON(IDEAS_FILE, { ideas });
  const updated = ideas.find((i) => i.id === id) || ideas[0];
  res.json(updated);
});

app.post('/api/ideas/:id/like', (req, res) => {
  const { id } = req.params;
  const { liked } = req.body;
  const data = readJSON(IDEAS_FILE);
  const ideas = data.ideas || [];
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: '创意不存在' });
  }
  if (liked === true) {
    if (!idea.liked) {
      idea.likes += 1;
      idea.liked = true;
    }
  } else if (liked === false) {
    if (idea.liked) {
      idea.likes = Math.max(0, idea.likes - 1);
      idea.liked = false;
    }
  }
  writeJSON(IDEAS_FILE, { ideas });
  res.json({ likes: idea.likes, liked: idea.liked });
});

app.get('/api/ideas/:id/comments', (req, res) => {
  const { id } = req.params;
  const data = readJSON(IDEAS_FILE);
  const ideas = data.ideas || [];
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: '创意不存在' });
  }
  res.json(idea.comments || []);
});

app.post('/api/ideas/:id/comments', (req, res) => {
  const { id } = req.params;
  const { author, content } = req.body;
  if (!author || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const data = readJSON(IDEAS_FILE);
  const ideas = data.ideas || [];
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: '创意不存在' });
  }
  const comment = {
    id: uuidv4(),
    author,
    content,
    createdAt: Date.now(),
  };
  idea.comments = idea.comments || [];
  idea.comments.push(comment);
  writeJSON(IDEAS_FILE, { ideas });
  res.status(201).json(comment);
});

app.post('/api/votes', (req, res) => {
  const { voterId, votes } = req.body;
  if (!voterId || !votes || !Array.isArray(votes)) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const data = readJSON(VOTES_FILE);
  const allVotes = data.votes || [];
  const filtered = allVotes.filter((v) => v.voterId !== voterId);
  votes.forEach(({ ideaId, priority }) => {
    if (ideaId && priority >= 1 && priority <= 5) {
      filtered.push({
        id: uuidv4(),
        ideaId,
        priority,
        voterId,
        createdAt: Date.now(),
      });
    }
  });
  writeJSON(VOTES_FILE, { votes: filtered });
  res.json({ success: true });
});

app.get('/api/votes/results', (_req, res) => {
  const votesData = readJSON(VOTES_FILE);
  const ideasData = readJSON(IDEAS_FILE);
  const votes = votesData.votes || [];
  const ideas = ideasData.ideas || [];

  const map = {};
  votes.forEach((v) => {
    if (!map[v.ideaId]) {
      map[v.ideaId] = { total: 0, count: 0 };
    }
    map[v.ideaId].total += v.priority;
    map[v.ideaId].count += 1;
  });

  const results = ideas.map((idea) => {
    const entry = map[idea.id];
    return {
      ideaId: idea.id,
      ideaTitle: idea.title,
      avgPriority: entry ? +(entry.total / entry.count).toFixed(2) : 0,
      voteCount: entry ? entry.count : 0,
    };
  }).sort((a, b) => b.avgPriority - a.avgPriority);

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Brainstorm API server running on http://localhost:${PORT}`);
});
