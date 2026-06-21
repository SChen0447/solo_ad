import express from 'express';
import cors from 'cors';
import {
  getAllOrders,
  getOrderById,
  getOrdersByStatus,
  createOrder,
  updateOrderStatus,
  getAllDeliveryTasks,
  getDeliveryTasksByZone,
  reorderDelivery,
  getStats,
  OrderStatus,
  DeliveryZone,
} from './data';

const app = express();
const PORT = 9527;

app.use(cors());
app.use(express.json());

app.get('/api/orders', (req, res) => {
  const { status } = req.query;
  if (status) {
    const orders = getOrdersByStatus(status as OrderStatus);
    res.json(orders);
  } else {
    res.json(getAllOrders());
  }
});

app.get('/api/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ error: '订单不存在' });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const newOrder = createOrder(req.body);
    res.status(201).json(newOrder);
  } catch (e) {
    res.status(400).json({ error: '订单数据不完整' });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const updated = updateOrderStatus(req.params.id, status as OrderStatus);
  if (updated) {
    res.json(updated);
  } else {
    res.status(400).json({ error: '状态更新失败，可能是状态流转顺序不正确' });
  }
});

app.get('/api/delivery', (req, res) => {
  const { zone } = req.query;
  if (zone) {
    res.json(getDeliveryTasksByZone(zone as DeliveryZone));
  } else {
    res.json(getAllDeliveryTasks());
  }
});

app.post('/api/delivery/reorder', (req, res) => {
  const { zone, orderId, newPosition } = req.body;
  const updated = reorderDelivery(zone as DeliveryZone, orderId, newPosition);
  res.json(updated);
});

app.get('/api/stats', (_req, res) => {
  res.json(getStats());
});

app.listen(PORT, () => {
  console.log(`团购协作平台后端服务已启动: http://localhost:${PORT}`);
});
