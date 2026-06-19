import express from 'express';
import cors from 'cors';
import type { NoteCard, Connection, AppState } from '../types';

const app = express();
const PORT = 45231;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let storedCards: NoteCard[] = [];
let storedConnections: Connection[] = [];

function generateSampleData(): AppState {
  const cards: NoteCard[] = [
    {
      id: 'sample-card-1',
      title: '项目概述',
      content: '这是一个可视化笔记图谱项目，用于梳理知识之间的关系。',
      color: '#FF6B6B',
      position: { x: 100, y: 150 },
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'sample-card-2',
      title: '核心功能',
      content: '支持卡片创建、拖拽连线、缩放平移、框选删除等功能。',
      color: '#4ECDC4',
      position: { x: 450, y: 100 },
      createdAt: Date.now() - 72000000,
    },
    {
      id: 'sample-card-3',
      title: '技术栈',
      content: 'React 18 + TypeScript + Vite + Express',
      color: '#FFE66D',
      position: { x: 450, y: 350 },
      createdAt: Date.now() - 36000000,
    },
    {
      id: 'sample-card-4',
      title: '使用方法',
      content: '双击卡片编辑内容，拖拽底部圆点创建连线，按住Ctrl+左键框选。',
      color: '#95E1D3',
      position: { x: 100, y: 400 },
      createdAt: Date.now() - 18000000,
    },
  ];

  const connections: Connection[] = [
    {
      id: 'sample-conn-1',
      sourceId: 'sample-card-1',
      targetId: 'sample-card-2',
      label: '包含功能',
    },
    {
      id: 'sample-conn-2',
      sourceId: 'sample-card-1',
      targetId: 'sample-card-4',
      label: '使用说明',
    },
    {
      id: 'sample-conn-3',
      sourceId: 'sample-card-2',
      targetId: 'sample-card-3',
      label: '基于技术',
    },
  ];

  return { cards, connections };
}

const sampleData = generateSampleData();
storedCards = sampleData.cards;
storedConnections = sampleData.connections;

app.get('/api/cards', (req, res) => {
  res.json({
    cards: storedCards,
    connections: storedConnections,
  });
});

app.post('/api/upload', (req, res) => {
  try {
    const { cards, connections } = req.body as AppState;
    if (cards && Array.isArray(cards)) {
      storedCards = cards;
    }
    if (connections && Array.isArray(connections)) {
      storedConnections = connections;
    }
    res.json({
      success: true,
      message: '数据保存成功',
      cards: storedCards,
      connections: storedConnections,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '数据格式错误',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cardCount: storedCards.length,
    connectionCount: storedConnections.length,
  });
});

app.listen(PORT, () => {
  console.log(`[Server] 可视化笔记图谱后端服务已启动: http://localhost:${PORT}`);
  console.log(`[Server] 当前卡片数: ${storedCards.length}, 连线数: ${storedConnections.length}`);
});
