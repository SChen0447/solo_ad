import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { RequestItem, CreateRequestInput, UpdateStatusInput } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const requests: RequestItem[] = [];

function calculateTotal(
  items: Array<{ name: string; quantity: number; unitPrice: number }>
): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

app.get('/api/requests', (_req, res) => {
  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/requests', (req, res) => {
  const { title, items, applicant }: CreateRequestInput = req.body;

  if (!title || !items || !Array.isArray(items) || items.length === 0 || !applicant) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const now = new Date().toISOString();
  const newRequest: RequestItem = {
    id: uuidv4(),
    title,
    items: items.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
    applicant,
    status: 'pending',
    total: calculateTotal(items),
    createdAt: now,
    updatedAt: now,
  };

  requests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const { status }: UpdateStatusInput = req.body;

  if (!status || !['pending', 'approved', 'rejected', 'delivered'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }

  const request = requests.find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: '申购单不存在' });
  }

  request.status = status;
  request.updatedAt = new Date().toISOString();
  res.json(request);
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
