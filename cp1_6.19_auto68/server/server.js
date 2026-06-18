import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const stories = new Map();

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function ensureUniqueCode() {
  let code;
  do {
    code = generateCode();
  } while (stories.has(code));
  return code;
}

app.post('/api/stories', (req, res) => {
  const { title, description, firstSegment, author } = req.body;
  if (!title || !firstSegment) {
    return res.status(400).json({ error: '标题和第一章内容不能为空' });
  }
  const code = ensureUniqueCode();
  const now = new Date().toISOString();
  const segment = {
    id: uuidv4(),
    content: firstSegment,
    author: author || '匿名',
    createdAt: now,
    branchId: null,
  };
  const story = {
    code,
    title,
    description: description || '',
    segments: [segment],
    branches: [],
    createdAt: now,
    updatedAt: now,
  };
  stories.set(code, story);
  res.status(201).json(story);
});

app.get('/api/stories', (req, res) => {
  const allStories = Array.from(stories.values());
  allStories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const result = allStories.map((s) => ({
    code: s.code,
    title: s.title,
    description: s.description,
    segmentCount: s.segments.length,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));
  res.json(result);
});

app.get('/api/stories/:code', (req, res) => {
  const story = stories.get(req.params.code);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  res.json(story);
});

app.post('/api/stories/:code/segments', (req, res) => {
  const story = stories.get(req.params.code);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  const { content, author, branchId } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '段落内容不能为空' });
  }
  if (content.length > 500) {
    return res.status(400).json({ error: '段落内容不能超过500字' });
  }
  const segment = {
    id: uuidv4(),
    content: content.trim(),
    author: author || '匿名',
    branchId: branchId || null,
    createdAt: new Date().toISOString(),
  };
  story.segments.push(segment);
  story.updatedAt = new Date().toISOString();
  res.status(201).json(segment);
});

app.get('/api/stories/:code/branches', (req, res) => {
  const story = stories.get(req.params.code);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  res.json(story.branches);
});

app.post('/api/stories/:code/branches', (req, res) => {
  const story = stories.get(req.params.code);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  const { fromSegmentId, title, author, firstContent } = req.body;
  if (!fromSegmentId || !firstContent) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const branchId = uuidv4();
  const now = new Date().toISOString();
  const segment = {
    id: uuidv4(),
    content: firstContent.trim(),
    author: author || '匿名',
    branchId,
    createdAt: now,
  };
  const branch = {
    id: branchId,
    fromSegmentId,
    title: title || story.title + '（分支）',
    segments: [segment],
    createdAt: now,
  };
  story.branches.push(branch);
  story.segments.push(segment);
  story.updatedAt = now;
  res.status(201).json(branch);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
