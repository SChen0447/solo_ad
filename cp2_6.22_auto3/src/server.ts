import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Product, Order, OrderStatus, SalesStats, DailySales } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const products = new Map<string, Product>();
const orders = new Map<string, Order>();
const dailySalesMap = new Map<string, number>();

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const seedProducts: Product[] = [
  {
    id: uuidv4(),
    name: '手工陶瓷马克杯',
    price: 68,
    stock: 45,
    description: '纯手工拉坯制作，每只都是独一无二的艺术品',
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=300&fit=crop',
    createdAt: now - 10 * dayMs,
  },
  {
    id: uuidv4(),
    name: '原创插画明信片',
    price: 12,
    stock: 200,
    description: '原创手绘插画，一套8张，含精美信封',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=300&fit=crop',
    createdAt: now - 9 * dayMs,
  },
  {
    id: uuidv4(),
    name: '手工编织钥匙扣',
    price: 28,
    stock: 80,
    description: '纯棉线手工编织，多种颜色可选',
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=300&fit=crop',
    createdAt: now - 8 * dayMs,
  },
  {
    id: uuidv4(),
    name: '植物香薰蜡烛',
    price: 58,
    stock: 35,
    description: '天然大豆蜡，薰衣草与雪松香型',
    imageUrl: 'https://images.unsplash.com/photo-1602874801006-e26c4c5b5bff?w=400&h=300&fit=crop',
    createdAt: now - 7 * dayMs,
  },
  {
    id: uuidv4(),
    name: '复古皮革笔记本',
    price: 88,
    stock: 25,
    description: '头层牛皮封面，手工装订，A5尺寸',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop',
    createdAt: now - 6 * dayMs,
  },
  {
    id: uuidv4(),
    name: '羊毛毡手作玩偶',
    price: 98,
    stock: 18,
    description: '100%澳洲羊毛，手工戳制小动物',
    imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop',
    createdAt: now - 5 * dayMs,
  },
];

seedProducts.forEach((p) => products.set(p.id, p));

const seedOrderCreators = [
  { daysAgo: 6, productIdx: 0, qty: 2, status: 'completed' as OrderStatus },
  { daysAgo: 6, productIdx: 1, qty: 5, status: 'completed' as OrderStatus },
  { daysAgo: 5, productIdx: 2, qty: 1, status: 'completed' as OrderStatus },
  { daysAgo: 5, productIdx: 3, qty: 3, status: 'completed' as OrderStatus },
  { daysAgo: 4, productIdx: 4, qty: 1, status: 'completed' as OrderStatus },
  { daysAgo: 4, productIdx: 0, qty: 1, status: 'shipping' as OrderStatus },
  { daysAgo: 3, productIdx: 1, qty: 10, status: 'paid' as OrderStatus },
  { daysAgo: 2, productIdx: 5, qty: 2, status: 'pending' as OrderStatus },
  { daysAgo: 1, productIdx: 2, qty: 4, status: 'paid' as OrderStatus },
  { daysAgo: 0, productIdx: 3, qty: 2, status: 'shipping' as OrderStatus },
  { daysAgo: 0, productIdx: 0, qty: 3, status: 'pending' as OrderStatus },
];

seedOrderCreators.forEach((s) => {
  const product = seedProducts[s.productIdx];
  const orderId = uuidv4();
  const createdAt = now - s.daysAgo * dayMs + Math.random() * dayMs;
  const order: Order = {
    id: orderId,
    productId: product.id,
    productName: product.name,
    productImageUrl: product.imageUrl,
    quantity: s.qty,
    totalPrice: product.price * s.qty,
    status: s.status,
    createdAt,
  };
  orders.set(orderId, order);
  if (s.status === 'completed' || s.status === 'shipping' || s.status === 'paid') {
    const dateKey = new Date(createdAt).toISOString().split('T')[0];
    dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) || 0) + order.totalPrice);
  }
});

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

app.get('/api/products', (_req: Request, res: Response) => {
  const list = Array.from(products.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.post('/api/products', (req: Request, res: Response) => {
  const { name, price, stock, description, imageUrl } = req.body;
  if (!name || price == null || stock == null) {
    res.status(400).json({ error: '名称、价格、库存为必填项' });
    return;
  }
  const id = uuidv4();
  const product: Product = {
    id,
    name,
    price: Number(price),
    stock: Number(stock),
    description: description || '',
    imageUrl: imageUrl || '',
    createdAt: Date.now(),
  };
  products.set(id, product);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = products.get(id);
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  const { name, price, stock, description, imageUrl } = req.body;
  const updated: Product = {
    ...product,
    name: name ?? product.name,
    price: price != null ? Number(price) : product.price,
    stock: stock != null ? Number(stock) : product.stock,
    description: description ?? product.description,
    imageUrl: imageUrl ?? product.imageUrl,
  };
  products.set(id, updated);
  res.json(updated);
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!products.has(id)) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  products.delete(id);
  res.json({ success: true });
});

app.get('/api/orders', (_req: Request, res: Response) => {
  const list = Array.from(orders.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) {
    res.status(400).json({ error: '商品ID和数量为必填项' });
    return;
  }
  const product = products.get(productId);
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  if (quantity > product.stock) {
    res.status(400).json({ error: `库存不足，当前库存：${product.stock}` });
    return;
  }
  const id = uuidv4();
  const createdAt = Date.now();
  const order: Order = {
    id,
    productId,
    productName: product.name,
    productImageUrl: product.imageUrl,
    quantity: Number(quantity),
    totalPrice: product.price * Number(quantity),
    status: 'pending',
    createdAt,
  };
  orders.set(id, order);
  product.stock -= Number(quantity);
  products.set(productId, product);
  res.status(201).json(order);
});

app.put('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses: OrderStatus[] = ['pending', 'paid', 'shipping', 'completed'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: '无效的订单状态' });
    return;
  }
  const order = orders.get(id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  order.status = status;
  orders.set(id, order);
  if (status === 'paid' || status === 'shipping' || status === 'completed') {
    const dateKey = formatDateKey(new Date(order.createdAt));
    dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) || 0) + order.totalPrice);
  }
  res.json(order);
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  const orderList = Array.from(orders.values());
  let todaySales = 0;
  let monthlyOrders = 0;

  orderList.forEach((o) => {
    const d = new Date(o.createdAt);
    if (formatDateKey(d) === todayKey && (o.status === 'paid' || o.status === 'shipping' || o.status === 'completed')) {
      todaySales += o.totalPrice;
    }
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      monthlyOrders++;
    }
  });

  const dailySales: DailySales[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * dayMs);
    const key = formatDateKey(d);
    dailySales.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      amount: dailySalesMap.get(key) || 0,
    });
  }

  const stats: SalesStats = {
    todaySales,
    monthlyOrders,
    totalProducts: products.size,
    dailySales,
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Market API server running on http://localhost:${PORT}`);
});

export default app;
