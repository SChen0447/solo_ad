import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { RequestItem, CreateRequestPayload, UpdateStatusPayload, RequestStatus } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let requests: RequestItem[] = [
  {
    id: uuidv4(),
    title: '2024年Q1文具采购',
    items: [
      { name: 'A4打印纸', quantity: 10, unitPrice: 25 },
      { name: '签字笔', quantity: 50, unitPrice: 3 },
      { name: '文件夹', quantity: 20, unitPrice: 5 },
    ],
    applicant: '张三',
    status: 'pending',
    total: 10 * 25 + 50 * 3 + 20 * 5,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: uuidv4(),
    title: 'IT部门设备耗材',
    items: [
      { name: '鼠标', quantity: 5, unitPrice: 80 },
      { name: '键盘', quantity: 3, unitPrice: 150 },
      { name: 'HDMI线', quantity: 10, unitPrice: 20 },
    ],
    applicant: '李四',
    status: 'approved',
    total: 5 * 80 + 3 * 150 + 10 * 20,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '办公室清洁用品',
    items: [
      { name: '洗手液', quantity: 10, unitPrice: 15 },
      { name: '纸巾', quantity: 30, unitPrice: 8 },
    ],
    applicant: '王五',
    status: 'delivered',
    total: 10 * 15 + 30 * 8,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '茶水间零食补给',
    items: [
      { name: '咖啡', quantity: 20, unitPrice: 30 },
      { name: '茶叶', quantity: 10, unitPrice: 50 },
    ],
    applicant: '赵六',
    status: 'rejected',
    total: 20 * 30 + 10 * 50,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

app.get('/api/requests', (_req: Request, res: Response<RequestItem[]>) => {
  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/requests', (req: Request<unknown, unknown, CreateRequestPayload>, res: Response<RequestItem>) => {
  const { title, items, applicant, total } = req.body;

  if (!title || !items || !Array.isArray(items) || items.length === 0 || !applicant) {
    res.status(400).json({} as RequestItem);
    return;
  }

  const now = new Date().toISOString();
  const newRequest: RequestItem = {
    id: uuidv4(),
    title,
    items,
    applicant,
    status: 'pending',
    total,
    createdAt: now,
    updatedAt: now,
  };

  requests.push(newRequest);
  res.status(201).json(newRequest);
});

app.patch(
  '/api/requests/:id',
  (req: Request<{ id: string }, unknown, UpdateStatusPayload>, res: Response<RequestItem | { error: string }>) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: RequestStatus[] = ['pending', 'approved', 'rejected', 'delivered'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: '无效的状态值' });
      return;
    }

    const index = requests.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: '申购单不存在' });
      return;
    }

    requests[index] = {
      ...requests[index],
      status,
      updatedAt: new Date().toISOString(),
    };

    res.json(requests[index]);
  }
);

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
