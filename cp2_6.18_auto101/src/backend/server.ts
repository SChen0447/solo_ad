import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { PurchaseRequest, CreateRequestDto, UpdateStatusDto } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const requests: PurchaseRequest[] = [
  {
    id: uuidv4(),
    title: '2024年Q1办公文具采购',
    items: [
      { name: 'A4打印纸', quantity: 10, unitPrice: 25 },
      { name: '中性笔', quantity: 50, unitPrice: 2 },
      { name: '文件夹', quantity: 20, unitPrice: 5 }
    ],
    applicant: '张三',
    status: 'pending',
    total: 450,
    createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T10:30:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '技术部设备采购申请',
    items: [
      { name: '机械键盘', quantity: 5, unitPrice: 300 },
      { name: '无线鼠标', quantity: 5, unitPrice: 120 }
    ],
    applicant: '李四',
    status: 'approved',
    total: 2100,
    createdAt: new Date('2024-01-10T14:20:00Z').toISOString(),
    updatedAt: new Date('2024-01-11T09:00:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '会议室用品补充',
    items: [
      { name: '白板笔', quantity: 30, unitPrice: 8 },
      { name: '便利贴', quantity: 50, unitPrice: 3 }
    ],
    applicant: '王五',
    status: 'rejected',
    total: 390,
    createdAt: new Date('2024-01-08T16:45:00Z').toISOString(),
    updatedAt: new Date('2024-01-09T10:15:00Z').toISOString()
  }
];

app.get('/api/requests', (_req: Request, res: Response<PurchaseRequest[]>) => {
  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/requests', (req: Request<unknown, unknown, CreateRequestDto>, res: Response<PurchaseRequest>) => {
  const { title, items, applicant, total } = req.body;

  if (!title || !items || !applicant || total === undefined) {
    res.status(400).json({} as PurchaseRequest);
    return;
  }

  const now = new Date().toISOString();
  const newRequest: PurchaseRequest = {
    id: uuidv4(),
    title,
    items,
    applicant,
    status: 'pending',
    total,
    createdAt: now,
    updatedAt: now
  };

  requests.unshift(newRequest);
  res.status(201).json(newRequest);
});

app.patch(
  '/api/requests/:id',
  (req: Request<{ id: string }, unknown, UpdateStatusDto>, res: Response<PurchaseRequest>) => {
    const { id } = req.params;
    const { status } = req.body;

    const index = requests.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({} as PurchaseRequest);
      return;
    }

    if (!['approved', 'rejected', 'delivered'].includes(status)) {
      res.status(400).json({} as PurchaseRequest);
      return;
    }

    requests[index].status = status;
    requests[index].updatedAt = new Date().toISOString();
    res.json(requests[index]);
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
