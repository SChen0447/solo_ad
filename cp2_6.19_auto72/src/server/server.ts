import express, { Request, Response } from 'express';
import cors from 'cors';
import type { AppState, NoteCard, Connection } from '../types';
import { PRESET_COLORS } from '../types';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let globalState: AppState = {
  cards: [],
  connections: [],
};

const sampleCards: NoteCard[] = [
  {
    id: uuidv4(),
    title: '欢迎使用',
    content: '这是一个可视化笔记图谱工具。点击空白处创建新卡片，拖拽卡片底部的圆点到另一张卡片来建立连接。',
    color: PRESET_COLORS[0],
    position: { x: 200, y: 200 },
    createdAt: Date.now() - 3600000,
    width: 220,
    height: 180,
  },
  {
    id: uuidv4(),
    title: '操作提示',
    content: '1. 中键拖拽平移画布\n2. 滚轮缩放\n3. Ctrl+左键框选\n4. Delete删除选中\n5. 双击卡片编辑',
    color: PRESET_COLORS[1],
    position: { x: 550, y: 200 },
    createdAt: Date.now() - 1800000,
    width: 220,
    height: 180,
  },
  {
    id: uuidv4(),
    title: '知识图谱',
    content: '将复杂的概念拆解成节点，通过连线建立它们之间的关系，帮助你更好地理解和记忆。',
    color: PRESET_COLORS[3],
    position: { x: 380, y: 450 },
    createdAt: Date.now() - 600000,
    width: 220,
    height: 180,
  },
];

const sampleConnections: Connection[] = [
  {
    id: uuidv4(),
    sourceId: sampleCards[0].id,
    targetId: sampleCards[1].id,
    label: '参考',
  },
  {
    id: uuidv4(),
    sourceId: sampleCards[1].id,
    targetId: sampleCards[2].id,
    label: '实现',
  },
  {
    id: uuidv4(),
    sourceId: sampleCards[0].id,
    targetId: sampleCards[2].id,
    label: '目标',
  },
];

globalState.cards = sampleCards;
globalState.connections = sampleConnections;

app.get('/api/cards', (_req: Request, res: Response) => {
  res.json(globalState);
});

app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const newState = req.body as AppState;
    if (!newState || !Array.isArray(newState.cards) || !Array.isArray(newState.connections)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    globalState = newState;
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
