import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  location: string;
  threshold: number;
  category: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  trackingNumber: string;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
}

const categories = ['电子产品', '服装', '食品', '家居', '文具', '运动'];

let products: Product[] = [
  { id: uuidv4(), name: '蓝牙耳机', sku: 'BT-EAR-001', quantity: 150, location: 'A-01-03', threshold: 20, category: '电子产品' },
  { id: uuidv4(), name: '纯棉T恤', sku: 'CT-TSH-002', quantity: 8, location: 'B-02-01', threshold: 15, category: '服装' },
  { id: uuidv4(), name: '有机绿茶', sku: 'OG-TEA-003', quantity: 200, location: 'C-01-05', threshold: 30, category: '食品' },
  { id: uuidv4(), name: '桌面台灯', sku: 'DL-LAM-004', quantity: 5, location: 'A-03-02', threshold: 10, category: '家居' },
  { id: uuidv4(), name: '签字笔套装', sku: 'SP-PEN-005', quantity: 500, location: 'D-01-01', threshold: 50, category: '文具' },
  { id: uuidv4(), name: '瑜伽垫', sku: 'YM-MAT-006', quantity: 3, location: 'B-04-03', threshold: 8, category: '运动' },
];

let orders: Order[] = [
  {
    id: uuidv4(),
    items: [{ productId: products[0].id, productName: '蓝牙耳机', sku: 'BT-EAR-001', quantity: 2 }],
    trackingNumber: 'SF1234567890',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    items: [{ productId: products[2].id, productName: '有机绿茶', sku: 'OG-TEA-003', quantity: 5 }],
    trackingNumber: 'JD9876543210',
    status: 'shipped',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    items: [{ productId: products[4].id, productName: '签字笔套装', sku: 'SP-PEN-005', quantity: 10 }],
    trackingNumber: 'YT5678901234',
    status: 'delivered',
    createdAt: new Date().toISOString(),
  },
];

app.get('/api/products', (_req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, sku, quantity, location, threshold, category } = req.body;
  if (!name || !sku || quantity === undefined || !location || threshold === undefined) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const product: Product = {
    id: uuidv4(),
    name,
    sku,
    quantity: Number(quantity),
    location,
    threshold: Number(threshold),
    category: category || '电子产品',
  };
  products.push(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  const { name, sku, quantity, location, threshold, category } = req.body;
  products[idx] = {
    ...products[idx],
    ...(name !== undefined && { name }),
    ...(sku !== undefined && { sku }),
    ...(quantity !== undefined && { quantity: Number(quantity) }),
    ...(location !== undefined && { location }),
    ...(threshold !== undefined && { threshold: Number(threshold) }),
    ...(category !== undefined && { category }),
  };
  res.json(products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  products.splice(idx, 1);
  res.status(204).send();
});

app.get('/api/orders', (_req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { items, trackingNumber } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: '订单商品不能为空' });
    return;
  }

  const insufficient: { productName: string; sku: string; requested: number; available: number }[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.quantity < item.quantity) {
      insufficient.push({
        productName: item.productName || (product ? product.name : '未知'),
        sku: item.sku || (product ? product.sku : ''),
        requested: item.quantity,
        available: product ? product.quantity : 0,
      });
    }
  }

  if (insufficient.length > 0) {
    res.status(400).json({ error: '库存不足', insufficient });
    return;
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.quantity -= item.quantity;
    }
  }

  const order: Order = {
    id: uuidv4(),
    items,
    trackingNumber: trackingNumber || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  const { status, trackingNumber } = req.body;
  if (status !== undefined) {
    orders[idx].status = status;
  }
  if (trackingNumber !== undefined) {
    orders[idx].trackingNumber = trackingNumber;
  }
  res.json(orders[idx]);
});

app.get('/api/stats', (_req, res) => {
  const totalProducts = products.length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const today = new Date().toISOString().slice(0, 10);
  const todayShipped = orders
    .filter((o) => o.status !== 'pending' && o.createdAt.slice(0, 10) === today)
    .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  res.json({ totalProducts, pendingOrders, todayShipped });
});

const PORT = 3100;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
