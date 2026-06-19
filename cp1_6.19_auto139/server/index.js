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
const DATA_PATH = path.join(__dirname, '..', 'data', 'boards.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { boards: [] };
  }
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/boards', (req, res) => {
  const data = readData();
  res.json({ boards: data.boards });
});

app.get('/api/boards/:id', (req, res) => {
  const data = readData();
  const board = data.boards.find(b => b.id === req.params.id);
  if (!board) {
    return res.status(404).json({ error: '画板不存在' });
  }
  res.json({ board });
});

app.post('/api/boards', (req, res) => {
  const { name, themeColor } = req.body;
  if (!name) {
    return res.status(400).json({ error: '画板名称不能为空' });
  }
  const newBoard = {
    id: uuidv4(),
    name,
    themeColor: themeColor || '#0f3460',
    cards: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const data = readData();
  data.boards.unshift(newBoard);
  writeData(data);
  res.status(201).json({ board: newBoard });
});

app.post('/api/boards/import', (req, res) => {
  const importData = req.body;
  if (!importData || !importData.board) {
    return res.status(400).json({ error: '导入数据无效' });
  }
  const data = readData();
  const existingIdx = data.boards.findIndex(b => b.id === importData.board.id);
  if (existingIdx >= 0) {
    importData.board.id = uuidv4();
    importData.board.name = importData.board.name + ' (导入)';
  }
  importData.board.createdAt = Date.now();
  importData.board.updatedAt = Date.now();
  data.boards.unshift(importData.board);
  writeData(data);
  res.status(201).json({ board: importData.board });
});

app.post('/api/boards/:id/cards', (req, res) => {
  const data = readData();
  const boardIdx = data.boards.findIndex(b => b.id === req.params.id);
  if (boardIdx < 0) {
    return res.status(404).json({ error: '画板不存在' });
  }
  const { type, content, x, y } = req.body;
  if (!type || !content) {
    return res.status(400).json({ error: '卡片类型和内容不能为空' });
  }
  const newCard = {
    id: uuidv4(),
    type,
    content,
    x: x || 0,
    y: y || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  data.boards[boardIdx].cards.push(newCard);
  data.boards[boardIdx].updatedAt = Date.now();
  writeData(data);
  res.status(201).json({ card: newCard });
});

app.put('/api/boards/:id/cards/:cardId', (req, res) => {
  const data = readData();
  const boardIdx = data.boards.findIndex(b => b.id === req.params.id);
  if (boardIdx < 0) {
    return res.status(404).json({ error: '画板不存在' });
  }
  const cardIdx = data.boards[boardIdx].cards.findIndex(c => c.id === req.params.cardId);
  if (cardIdx < 0) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  const { content, x, y } = req.body;
  if (content !== undefined) {
    data.boards[boardIdx].cards[cardIdx].content = content;
  }
  if (x !== undefined) {
    data.boards[boardIdx].cards[cardIdx].x = x;
  }
  if (y !== undefined) {
    data.boards[boardIdx].cards[cardIdx].y = y;
  }
  data.boards[boardIdx].cards[cardIdx].updatedAt = Date.now();
  data.boards[boardIdx].updatedAt = Date.now();
  writeData(data);
  res.json({ card: data.boards[boardIdx].cards[cardIdx] });
});

app.delete('/api/boards/:id/cards/:cardId', (req, res) => {
  const data = readData();
  const boardIdx = data.boards.findIndex(b => b.id === req.params.id);
  if (boardIdx < 0) {
    return res.status(404).json({ error: '画板不存在' });
  }
  const cardIdx = data.boards[boardIdx].cards.findIndex(c => c.id === req.params.cardId);
  if (cardIdx < 0) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  data.boards[boardIdx].cards.splice(cardIdx, 1);
  data.boards[boardIdx].updatedAt = Date.now();
  writeData(data);
  res.json({ success: true });
});

app.get('/api/boards/:id/export', (req, res) => {
  const data = readData();
  const board = data.boards.find(b => b.id === req.params.id);
  if (!board) {
    return res.status(404).json({ error: '画板不存在' });
  }
  const exportData = {
    board: {
      id: board.id,
      name: board.name,
      themeColor: board.themeColor,
      cards: board.cards.map(c => ({
        id: c.id,
        type: c.type,
        content: c.content,
        x: c.x,
        y: c.y
      })),
      exportedAt: Date.now()
    }
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(board.name)}.json"`);
  res.json(exportData);
});

app.listen(PORT, () => {
  console.log(`灵感画板后端服务运行在 http://localhost:${PORT}`);
});
