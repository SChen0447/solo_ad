import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { works, materialPacks, orders } from './dataStore';
import type { Order, OrderStatus } from '../shared/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/works', (_req, res) => {
  res.json(works);
});

app.get('/works/:id', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  res.json(work);
});

app.get('/materials', (_req, res) => {
  res.json(materialPacks);
});

app.get('/materials/:id', (req, res) => {
  const pack = materialPacks.find((m) => m.id === req.params.id);
  if (!pack) {
    res.status(404).json({ error: '材料包不存在' });
    return;
  }
  res.json(pack);
});

app.get('/orders', (_req, res) => {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/orders', (req, res) => {
  const { materialPackId, quantity, customerName, customerPhone } = req.body;

  if (!materialPackId || !quantity || !customerName || !customerPhone) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }

  const pack = materialPacks.find((m) => m.id === materialPackId);
  if (!pack) {
    res.status(404).json({ error: '材料包不存在' });
    return;
  }

  const newOrder: Order = {
    id: uuidv4(),
    materialPackId,
    materialPackName: pack.name,
    quantity: Number(quantity),
    totalPrice: pack.price * Number(quantity),
    status: '已提交' as OrderStatus,
    customerName,
    customerPhone,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  app.listen(PORT, () => {
    console.log(`后端 API 服务器运行在 http://localhost:${PORT}`);
  });
}

export default app;
