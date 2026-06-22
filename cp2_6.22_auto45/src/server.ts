import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  status: 'active' | 'cancelled';
}

interface User {
  id: string;
  name: string;
}

interface UserBreakdownItem {
  userId: string;
  userName: string;
  quantity: number;
  picked: boolean;
  pickedAt?: string;
}

interface MergedOrderItem {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  userBreakdown: UserBreakdownItem[];
}

const products: Map<string, Product> = new Map();
const orders: Map<string, Order> = new Map();
const pickups: Map<string, boolean> = new Map();
const pickupTimes: Map<string, string> = new Map();

const users: User[] = [
  { id: 'user-1', name: '张三' },
  { id: 'user-2', name: '李四' },
  { id: 'user-3', name: '王五' },
];

const initialProducts: Product[] = [
  { id: 'p-1', name: '红富士苹果', price: 6.8, stock: 50, category: '水果' },
  { id: 'p-2', name: '海南香蕉', price: 4.5, stock: 3, category: '水果' },
  { id: 'p-3', name: '进口车厘子', price: 68.0, stock: 10, category: '水果' },
  { id: 'p-4', name: '乐事薯片', price: 8.9, stock: 30, category: '零食' },
  { id: 'p-5', name: '每日坚果', price: 29.9, stock: 4, category: '零食' },
  { id: 'p-6', name: '卷纸(10卷)', price: 25.0, stock: 20, category: '日用品' },
  { id: 'p-7', name: '洗衣液 2L', price: 35.8, stock: 15, category: '日用品' },
  { id: 'p-8', name: '土鸡蛋(30枚)', price: 38.0, stock: 12, category: '食品' },
  { id: 'p-9', name: '鲜牛奶 1L', price: 15.9, stock: 8, category: '食品' },
  { id: 'p-10', name: '全麦面包', price: 12.0, stock: 25, category: '食品' },
];

initialProducts.forEach((p) => products.set(p.id, p));

app.get('/api/products', (_req, res) => {
  res.json(Array.from(products.values()));
});

app.post('/api/products', (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name || price == null || stock == null || !category) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const id = uuidv4();
  const product: Product = { id, name, price: Number(price), stock: Number(stock), category };
  products.set(id, product);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.get(id);
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  if (req.body.stock != null) {
    product.stock = Number(req.body.stock);
  }
  if (req.body.name) {
    product.name = req.body.name;
  }
  if (req.body.price != null) {
    product.price = Number(req.body.price);
  }
  products.set(id, product);
  res.json(product);
});

app.get('/api/users', (_req, res) => {
  res.json(users);
});

app.get('/api/orders', (req, res) => {
  const { userId } = req.query;
  const orderArr = Array.from(orders.values());
  if (userId) {
    res.json(orderArr.filter((o) => o.userId === userId && o.status === 'active'));
  } else {
    res.json(orderArr.filter((o) => o.status === 'active'));
  }
});

app.post('/api/orders', (req, res) => {
  const { userId, userName, items: rawItems } = req.body;
  if (!userId || !userName || !rawItems || !Array.isArray(rawItems)) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const ri of rawItems) {
    const product = products.get(ri.productId);
    if (!product) continue;
    const qty = Number(ri.quantity);
    const subtotal = product.price * qty;
    orderItems.push({
      productId: product.id, productName: product.name, quantity: qty, unitPrice: product.price, subtotal,
    });
    total += subtotal;
  }
  if (orderItems.length === 0) {
    res.status(400).json({ error: '订单条目无效' });
    return;
  }
  const order: Order = {
    id: uuidv4(),
    userId,
    userName,
    items: orderItems,
    totalAmount: Math.round(total * 100) / 100,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  orders.set(order.id, order);
  res.status(201).json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.get(id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  const { items: rawItems } = req.body;
  if (!rawItems || !Array.isArray(rawItems)) {
    res.status(400).json({ error: '缺少 items' });
    return;
  }
  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const ri of rawItems) {
    const product = products.get(ri.productId);
    if (!product) continue;
    const qty = Number(ri.quantity);
    if (qty <= 0) continue;
    const subtotal = product.price * qty;
    orderItems.push({
      productId: product.id, productName: product.name, quantity: qty, unitPrice: product.price, subtotal,
    });
    total += subtotal;
  }
  order.items = orderItems;
  order.totalAmount = Math.round(total * 100) / 100;
  orders.set(id, order);
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.get(id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  order.status = 'cancelled';
  orders.set(id, order);
  res.json({ success: true });
});

app.get('/api/merged-orders', (_req, res) => {
  const merged = new Map<string, MergedOrderItem>();
  for (const order of orders.values()) {
    if (order.status !== 'active') continue;
    for (const item of order.items) {
      if (!merged.has(item.productId)) {
        merged.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalAmount: 0,
          userBreakdown: [],
        });
      }
      const m = merged.get(item.productId)!;
      m.totalQuantity += item.quantity;
      m.totalAmount += item.subtotal;
      const pk = `${item.productId}_${order.userId}`;
      const existing = m.userBreakdown.find(ub => ub.userId === order.userId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        m.userBreakdown.push({
          userId: order.userId,
          userName: order.userName,
          quantity: item.quantity,
          picked: pickups.get(pk) ?? false,
          pickedAt: pickupTimes.get(pk),
        });
      }
    }
  }
  const result: MergedOrderItem[] = Array.from(merged.values()).map(m => ({
    ...m,
    totalAmount: Math.round(m.totalAmount * 100) / 100,
  }));
  res.json(result);
});

app.post('/api/pickup', (req, res) => {
  const { productId, userId, picked } = req.body;
  if (!productId || !userId || picked == null) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const key = `${productId}_${userId}`;
  pickups.set(key, picked);
  if (picked) {
    pickupTimes.set(key, new Date().toISOString());
  } else {
    pickupTimes.delete(key);
  }
  res.json({ success: true, pickedAt: pickupTimes.get(key) });
});

app.get('/api/stats', (_req, res) => {
  const activeOrders = Array.from(orders.values()).filter(o => o.status === 'active');
  const uniqueProducts = new Set<string>();
  let totalAmount = 0;
  let totalPickedCount = 0;
  let totalBreakdownCount = 0;

  const merged = new Map<string, MergedOrderItem>();
  for (const order of activeOrders) {
    totalAmount += order.totalAmount;
    for (const item of order.items) {
      uniqueProducts.add(item.productId);
      if (!merged.has(item.productId)) {
        merged.set(item.productId, { productId: item.productId, productName: item.productName, totalQuantity: 0, totalAmount: 0, userBreakdown: [] });
      }
      const m = merged.get(item.productId)!;
      m.totalQuantity += item.quantity;
      m.totalAmount += item.subtotal;
      const pk = `${item.productId}_${order.userId}`;
      const existing = m.userBreakdown.find(ub => ub.userId === order.userId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        m.userBreakdown.push({
          userId: order.userId, userName: order.userName, quantity: item.quantity,
          picked: pickups.get(pk) ?? false, pickedAt: pickupTimes.get(pk),
        });
      }
    }
  }
  for (const m of merged.values()) {
    for (const ub of m.userBreakdown) {
      totalBreakdownCount++;
      if (ub.picked) totalPickedCount++;
    }
  }
  res.json({
    totalOrders: activeOrders.length,
    totalProducts: uniqueProducts.size,
    totalAmount: Math.round(totalAmount * 100) / 100,
    pickedRate: totalBreakdownCount > 0 ? Math.round((totalPickedCount / totalBreakdownCount) * 100) / 100 : 0,
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[server] Server is running on http://localhost:${PORT}`);
});
