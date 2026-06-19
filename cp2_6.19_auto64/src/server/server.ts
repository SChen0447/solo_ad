import express, { Request, Response } from 'express';
import cors from 'cors';
import { AppState } from '../types';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

let globalState: AppState = {
  cards: [
    {
      id: 'demo-1',
      title: '欢迎使用笔记图谱',
      content: '这是一个可视化知识图谱工具，点击空白处创建新卡片，拖拽卡片底部圆点连接其他卡片。',
      color: '#45B7D1',
      position: { x: 100, y: 200 },
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      width: 220
    },
    {
      id: 'demo-2',
      title: '核心功能',
      content: '1. 创建卡片\n2. 连接卡片\n3. 缩放平移\n4. 批量选择',
      color: '#96CEB4',
      position: { x: 500, y: 150 },
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      width: 220
    },
    {
      id: 'demo-3',
      title: '快捷键',
      content: '滚轮缩放\n中键平移\nCtrl+左键框选\nDelete删除',
      color: '#DDA0DD',
      position: { x: 450, y: 400 },
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      width: 220
    }
  ],
  connections: [
    {
      id: 'conn-1',
      sourceId: 'demo-1',
      targetId: 'demo-2',
      label: '相关联'
    },
    {
      id: 'conn-2',
      sourceId: 'demo-2',
      targetId: 'demo-3',
      label: '包含'
    },
    {
      id: 'conn-3',
      sourceId: 'demo-1',
      targetId: 'demo-3',
      label: '引导'
    }
  ]
};

app.get('/api/cards', (_req: Request, res: Response) => {
  console.log('[GET] /api/cards - 获取所有卡片和连线');
  res.json(globalState);
});

app.post('/api/upload', (req: Request, res: Response) => {
  console.log('[POST] /api/upload - 上传覆盖状态');
  const newState = req.body as AppState;
  if (!newState || !Array.isArray(newState.cards) || !Array.isArray(newState.connections)) {
    return res.status(400).json({ error: '无效的数据格式' });
  }
  globalState = newState;
  res.json({ success: true, state: globalState });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
