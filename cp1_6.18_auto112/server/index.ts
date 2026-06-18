import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lastSubmit?: number;
}

interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: number;
  branchId: string;
  parentId?: string;
}

interface Branch {
  id: string;
  name: string;
  color: string;
  parentParagraphId?: string;
}

interface StoryData {
  id: string;
  title: string;
  branches: Branch[];
  paragraphs: Record<string, Paragraph[]>;
  characters: Character[];
  cooldownSeconds: number;
  maxWords: number;
}

interface WsClient extends WebSocket {
  userId?: string;
  branchId?: string;
}

const SENSITIVE_WORDS = ['暴力', '色情', '赌博', '毒品', '诈骗', '恐怖'];
const AVATAR_COLORS = [
  '#f4a261', '#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d',
  '#b98380', '#9a8c98', '#f9c74f', '#90be6d', '#43aa8b'
];
const BRANCH_COLORS = ['#5d4e37', '#b4a7d6', '#a3d8d6', '#f4c2c2', '#c5e1a5'];

const COOLDOWN_SECONDS = 30;
const MAX_WORDS = 300;
const STORAGE_PATH = path.join(process.cwd(), 'server', 'story-data.json');

let storyData: StoryData = loadStory();
const onlineUsers = new Map<string, User>();
const editingUsers = new Map<string, string>();

function loadStory(): StoryData {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Load story error:', e);
  }
  return createDefaultStory();
}

function createDefaultStory(): StoryData {
  const mainBranchId = uuidv4();
  return {
    id: uuidv4(),
    title: '我们的故事',
    branches: [
      { id: mainBranchId, name: '主线', color: BRANCH_COLORS[0] }
    ],
    paragraphs: {
      [mainBranchId]: [
        {
          id: uuidv4(),
          content: '故事从一个温暖的早晨开始，阳光透过窗帘洒进房间...',
          authorId: 'system',
          authorName: '故事开始',
          authorAvatar: '📖',
          timestamp: Date.now(),
          branchId: mainBranchId
        }
      ]
    },
    characters: [
      { id: uuidv4(), name: '小明', emoji: '👦', color: '#f4a261' },
      { id: uuidv4(), name: '小红', emoji: '👧', color: '#e76f51' }
    ],
    cooldownSeconds: COOLDOWN_SECONDS,
    maxWords: MAX_WORDS
  };
}

function saveStory() {
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(storyData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Save story error:', e);
  }
}

function filterSensitiveWords(content: string): boolean {
  return SENSITIVE_WORDS.some(word => content.includes(word));
}

function countWords(content: string): number {
  return content.trim().length;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/story', (_req, res) => {
  res.json(storyData);
});

app.get('/api/branches', (_req, res) => {
  res.json(storyData.branches);
});

app.get('/api/paragraphs/:branchId', (req, res) => {
  const { branchId } = req.params;
  res.json(storyData.paragraphs[branchId] || []);
});

app.get('/api/characters', (_req, res) => {
  res.json(storyData.characters);
});

app.post('/api/paragraphs', (req, res) => {
  const { content, authorId, branchId, parentId } = req.body;

  if (!content || !authorId || !branchId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (filterSensitiveWords(content)) {
    return res.status(400).json({ error: '内容包含不适当词汇，请修改' });
  }

  if (countWords(content) > storyData.maxWords) {
    return res.status(400).json({ error: '字数超标' });
  }

  const user = onlineUsers.get(authorId);
  if (!user) {
    return res.status(400).json({ error: '用户不存在' });
  }

  const now = Date.now();
  if (user.lastSubmit && now - user.lastSubmit < storyData.cooldownSeconds * 1000) {
    return res.status(429).json({ error: '请等待冷却时间结束' });
  }

  user.lastSubmit = now;

  const paragraph: Paragraph = {
    id: uuidv4(),
    content,
    authorId,
    authorName: user.name,
    authorAvatar: user.avatar,
    timestamp: now,
    branchId,
    parentId
  };

  if (!storyData.paragraphs[branchId]) {
    storyData.paragraphs[branchId] = [];
  }
  storyData.paragraphs[branchId].push(paragraph);
  saveStory();

  broadcast({
    type: 'paragraph-added',
    data: { paragraph, branchId }
  });

  res.json(paragraph);
});

app.post('/api/branches', (req, res) => {
  const { parentParagraphId, branchName } = req.body;

  if (!parentParagraphId) {
    return res.status(400).json({ error: '缺少父段落ID' });
  }

  const colorIdx = storyData.branches.length % BRANCH_COLORS.length;
  const newBranch: Branch = {
    id: uuidv4(),
    name: branchName || `分支${storyData.branches.length}`,
    color: BRANCH_COLORS[colorIdx],
    parentParagraphId
  };

  storyData.branches.push(newBranch);

  let parentParagraph: Paragraph | null = null;
  for (const [, paragraphs] of Object.entries(storyData.paragraphs)) {
    const found = paragraphs.find(p => p.id === parentParagraphId);
    if (found) {
      parentParagraph = found;
      break;
    }
  }

  if (parentParagraph) {
    const starter: Paragraph = {
      id: uuidv4(),
      content: parentParagraph.content,
      authorId: parentParagraph.authorId,
      authorName: parentParagraph.authorName,
      authorAvatar: parentParagraph.authorAvatar,
      timestamp: parentParagraph.timestamp,
      branchId: newBranch.id,
      parentId: parentParagraph.id
    };
    storyData.paragraphs[newBranch.id] = [starter];
  } else {
    storyData.paragraphs[newBranch.id] = [];
  }

  saveStory();

  broadcast({
    type: 'branch-created',
    data: newBranch
  });

  res.json(newBranch);
});

app.post('/api/characters', (req, res) => {
  const { name, emoji } = req.body;
  if (!name || !emoji) {
    return res.status(400).json({ error: '缺少角色信息' });
  }
  const character: Character = {
    id: uuidv4(),
    name,
    emoji,
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  };
  storyData.characters.push(character);
  saveStory();

  broadcast({
    type: 'character-added',
    data: character
  });

  res.json(character);
});

app.put('/api/characters/:id', (req, res) => {
  const { id } = req.params;
  const { name, emoji } = req.body;
  const idx = storyData.characters.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '角色不存在' });
  }
  storyData.characters[idx] = { ...storyData.characters[idx], name, emoji };
  saveStory();

  broadcast({
    type: 'character-updated',
    data: storyData.characters[idx]
  });

  res.json(storyData.characters[idx]);
});

app.delete('/api/characters/:id', (req, res) => {
  const { id } = req.params;
  storyData.characters = storyData.characters.filter(c => c.id !== id);
  saveStory();

  broadcast({
    type: 'character-deleted',
    data: { id }
  });

  res.json({ success: true });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws: WsClient) => {
  const userId = uuidv4();
  ws.userId = userId;

  const user: User = {
    id: userId,
    name: `创作者${Math.floor(Math.random() * 9000 + 1000)}`,
    avatar: ['🧑‍🎨', '👨‍💻', '👩‍💻', '🧙', '🦊', '🐱', '🐶', '🦄'][Math.floor(Math.random() * 8)],
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  };
  onlineUsers.set(userId, user);

  ws.send(JSON.stringify({
    type: 'init',
    data: { user, story: storyData, users: Array.from(onlineUsers.values()) }
  }));

  broadcast({
    type: 'user-joined',
    data: user
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'editing') {
        if (msg.isEditing) {
          editingUsers.set(userId, msg.branchId || '');
        } else {
          editingUsers.delete(userId);
        }
        broadcast({
          type: 'editing-update',
          data: {
            userId,
            userName: user.name,
            branchId: msg.branchId,
            isEditing: msg.isEditing
          }
        });
      }

      if (msg.type === 'switch-branch') {
        ws.branchId = msg.branchId;
      }
    } catch (e) {
      console.error('Parse message error:', e);
    }
  });

  ws.on('close', () => {
    onlineUsers.delete(userId);
    editingUsers.delete(userId);
    broadcast({
      type: 'user-left',
      data: { userId }
    });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Story server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});
