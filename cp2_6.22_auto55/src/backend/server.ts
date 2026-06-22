import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { RentalItem, Order, OrderItem, OrderStatus } from '../types';
import { INITIAL_ITEMS } from '../types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const itemsMap = new Map<string, RentalItem>();
const ordersMap = new Map<string, Order>();

INITIAL_ITEMS.forEach((item) => {
  const id = uuidv4();
  itemsMap.set(id, { ...item, id });
});

app.get('/api/items', (_req: Request, res: Response) => {
  const items = Array.from(itemsMap.values());
  res.json(items);
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  const item = itemsMap.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: '物品不存在' });
    return;
  }
  res.json(item);
});

app.put('/api/items/:id/status', (req: Request, res: Response) => {
  const item = itemsMap.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: '物品不存在' });
    return;
  }
  const { status } = req.body as { status: string };
  item.status = status as RentalItem['status'];
  res.json(item);
});

app.get('/api/orders', (_req: Request, res: Response) => {
  const orders = Array.from(ordersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(orders);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = ordersMap.get(req.params.id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  res.json(order);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { customerName, customerPhone, itemIds, rentalDays } = req.body as {
    customerName: string;
    customerPhone: string;
    itemIds: string[];
    rentalDays: number;
  };

  if (!customerName || !customerPhone || !itemIds || !rentalDays) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const orderItems: OrderItem[] = [];
  let totalPrice = 0;

  const itemQuantityMap = new Map<string, number>();
  itemIds.forEach((id: string) => {
    itemQuantityMap.set(id, (itemQuantityMap.get(id) || 0) + 1);
  });

  for (const [itemId, quantity] of itemQuantityMap) {
    const item = itemsMap.get(itemId);
    if (!item) {
      res.status(400).json({ error: `物品不存在: ${itemId}` });
      return;
    }
    const available = item.totalStock - item.rentedCount;
    if (quantity > available) {
      res.status(400).json({ error: `库存不足，${item.name}最多可租${available}件` });
      return;
    }
    const itemTotal = item.pricePerDay * rentalDays * quantity;
    totalPrice += itemTotal;
    orderItems.push({
      itemId,
      itemName: item.name,
      quantity,
      pricePerDay: item.pricePerDay,
    });
  }

  const order: Order = {
    id: uuidv4(),
    customerName,
    customerPhone,
    items: orderItems,
    rentalDays,
    totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  ordersMap.set(order.id, order);
  res.status(201).json(order);
});

app.post('/api/orders/:id/approve', (req: Request, res: Response) => {
  const order = ordersMap.get(req.params.id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  if (order.status !== 'pending') {
    res.status(400).json({ error: '订单状态不允许审核' });
    return;
  }

  const { approved } = req.body as { approved: boolean };

  if (approved) {
    for (const orderItem of order.items) {
      const item = itemsMap.get(orderItem.itemId);
      if (item) {
        item.rentedCount += orderItem.quantity;
      }
    }
    order.status = 'confirmed';
  } else {
    order.status = 'rejected';
  }

  res.json(order);
});

app.post('/api/orders/:id/return', (req: Request, res: Response) => {
  const order = ordersMap.get(req.params.id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  if (order.status !== 'confirmed') {
    res.status(400).json({ error: '订单状态不允许归还' });
    return;
  }

  const { returnedItemIds } = req.body as { returnedItemIds: string[] };

  const returnedSet = new Set<string>(returnedItemIds || []);

  for (const orderItem of order.items) {
    const item = itemsMap.get(orderItem.itemId);
    if (!item) continue;

    if (returnedSet.has(orderItem.itemId)) {
      item.rentedCount = Math.max(0, item.rentedCount - orderItem.quantity);
    } else {
      item.rentedCount = Math.max(0, item.rentedCount - orderItem.quantity);
      item.totalStock = Math.max(0, item.totalStock - orderItem.quantity);
      item.status = 'maintenance';
    }
  }

  order.status = 'returned';
  order.returnedItems = Array.from(returnedSet);

  res.json(order);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
