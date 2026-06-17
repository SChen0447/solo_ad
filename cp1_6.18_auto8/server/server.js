import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, '..', 'data', 'board.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let writeDebounceTimer = null;

function readBoard() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify({ cards: [] }, null, 2));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readBoard error:', e);
    return { cards: [] };
  }
}

function writeBoard(data) {
  if (writeDebounceTimer) clearTimeout(writeDebounceTimer);
  writeDebounceTimer = setTimeout(() => {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('writeBoard error:', e);
    }
  }, 50);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/api/cards', (_req, res) => {
  const data = readBoard();
  res.json(data.cards || []);
});

app.post('/api/cards', (req, res) => {
  const { title, description, sourceBranch, targetBranch, labels, creator } = req.body || {};
  if (!title || !sourceBranch || !targetBranch || !creator) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const now = new Date().toISOString();
  const card = {
    id: 'mr_' + nanoid(8),
    title: String(title).slice(0, 200),
    description: String(description || '').slice(0, 2000),
    sourceBranch: String(sourceBranch).slice(0, 200),
    targetBranch: String(targetBranch).slice(0, 200),
    labels: Array.isArray(labels) ? labels : [],
    creator: String(creator).slice(0, 100),
    status: 'pending',
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
  const data = readBoard();
  data.cards = data.cards || [];
  data.cards.unshift(card);
  writeBoard(data);
  res.status(201).json(card);
});

app.patch('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const validStatus = ['pending', 'reviewing', 'merged'];
  if (status && !validStatus.includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }
  const data = readBoard();
  data.cards = data.cards || [];
  const idx = data.cards.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: '卡片不存在' });
  if (status) data.cards[idx].status = status;
  data.cards[idx].updatedAt = new Date().toISOString();
  writeBoard(data);
  res.json(data.cards[idx]);
});

app.post('/api/cards/:id/comments', (req, res) => {
  const { id } = req.params;
  const { author, content, mentions, codeSnippet } = req.body || {};
  if (!author || !content) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const data = readBoard();
  data.cards = data.cards || [];
  const card = data.cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ error: '卡片不存在' });

  const comment = {
    id: 'cmt_' + nanoid(8),
    author: String(author).slice(0, 100),
    content: String(content).slice(0, 5000),
    mentions: Array.isArray(mentions) ? mentions : [],
    reactions: { '👍': [], '❤️': [], '😄': [] },
    createdAt: new Date().toISOString(),
  };
  if (codeSnippet && codeSnippet.code) {
    comment.codeSnippet = {
      id: 'snip_' + nanoid(6),
      language: String(codeSnippet.language || 'plaintext').slice(0, 50),
      code: String(codeSnippet.code).slice(0, 10000),
    };
  }
  card.comments = card.comments || [];
  card.comments.push(comment);
  card.updatedAt = new Date().toISOString();
  writeBoard(data);
  res.status(201).json(comment);
});

app.patch('/api/cards/:id/comments/:commentId/reactions', (req, res) => {
  const { id, commentId } = req.params;
  const { emoji, user } = req.body || {};
  const validEmojis = ['👍', '❤️', '😄'];
  if (!validEmojis.includes(emoji) || !user) {
    return res.status(400).json({ error: '无效的表情或用户' });
  }
  const data = readBoard();
  data.cards = data.cards || [];
  const card = data.cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ error: '卡片不存在' });
  const comment = (card.comments || []).find((c) => c.id === commentId);
  if (!comment) return res.status(404).json({ error: '评论不存在' });

  comment.reactions = comment.reactions || { '👍': [], '❤️': [], '😄': [] };
  if (!Array.isArray(comment.reactions[emoji])) comment.reactions[emoji] = [];
  const userIdx = comment.reactions[emoji].indexOf(user);
  if (userIdx === -1) {
    comment.reactions[emoji].push(user);
  } else {
    comment.reactions[emoji].splice(userIdx, 1);
  }
  card.updatedAt = new Date().toISOString();
  writeBoard(data);
  res.json(comment);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`[server] CodeReview Kanban API running on http://localhost:${PORT}`);
});
