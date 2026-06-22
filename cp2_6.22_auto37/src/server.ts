import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

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
  price: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  createdAt: string;
}

interface PickupInfo {
  picked: boolean;
  pickedAt?: string;
}

interface PickupStatus {
  [productId: string]: {
    [userId: string]: PickupInfo;
  };
}

interface MergedItem {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  buyers: { userId: string; userName: string; quantity: number }[];
  pickupStatus: { [userId: string]: PickupInfo };
}

const products: Product[] = [
  { id: 'p1', name: '红富士苹果', price: 5.8, stock: 50, category: '水果' },
  { id: 'p2', name: '云南香蕉', price: 3.5, stock: 40, category: '水果' },
  { id: 'p3', name: '有机鸡蛋', price: 22.0, stock: 15, category: '蛋奶' },
  { id: 'p4', name: '全麦面包', price: 8.5, stock: 20, category: '烘焙' },
  { id: 'p5', name: '坚果混合装', price: 28.0, stock: 20, category: '零食' },
  { id: 'p6', name: '手工饼干', price: 15.0, stock: 30, category: '零食' },
  { id: 'p7', name: '抽纸6包装', price: 18.5, stock: 25, category: '日用品' },
  { id: 'p8', name: '洗洁精', price: 12.0, stock: 35, category: '日用品' },
  { id: 'p9', name: '新鲜菠菜', price: 4.2, stock: 30, category: '蔬菜' },
  { id: 'p10', name: '土猪五花肉', price: 35.0, stock: 12, category: '肉类' },
];

const orders: Order[] = [];
const pickupStatus: PickupStatus = {};

function calculateSoldCount(productId: string): number {
  let count = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId === productId) {
        count += item.quantity;
      }
    }
  }
  return count;
}

function getProductsWithSoldCount() {
  return products.map((p) => ({
    ...p,
    soldCount: calculateSoldCount(p.id),
  }));
}

function getMergedOrders(): MergedItem[] {
  const merged: { [productId: string]: MergedItem } = {};

  for (const order of orders) {
    for (const item of order.items) {
      if (!merged[item.productId]) {
        const product = products.find((p) => p.id === item.productId);
        merged[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          category: product?.category || '其他',
          totalQuantity: 0,
          totalAmount: 0,
          buyers: [],
          pickupStatus: pickupStatus[item.productId] || {},
        };
      }
      merged[item.productId].totalQuantity += item.quantity;
      merged[item.productId].totalAmount += item.quantity * item.price;

      const existingBuyer = merged[item.productId].buyers.find(
        (b) => b.userId === order.userId
      );
      if (existingBuyer) {
        existingBuyer.quantity += item.quantity;
      } else {
        merged[item.productId].buyers.push({
          userId: order.userId,
          userName: order.userName,
          quantity: item.quantity,
        });
      }
    }
  }

  return Object.values(merged);
}

app.get('/api/products', (req, res) => {
  res.json(getProductsWithSoldCount());
});

app.post('/api/products', (req, res) => {
  const { name, price, stock, category } = req.body;
  const newProduct: Product = {
    id: uuidv4(),
    name,
    price: Number(price),
    stock: Number(stock),
    category: category || '其他',
  };
  products.push(newProduct);
  res.status(201).json({ ...newProduct, soldCount: 0 });
});

app.patch('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { stock, name, price, category } = req.body;
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: '商品不存在' });
  }
  if (stock !== undefined) product.stock = Number(stock);
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = Number(price);
  if (category !== undefined) product.category = category;
  res.json({ ...product, soldCount: calculateSoldCount(product.id) });
});

app.post('/api/orders', (req, res) => {
  const { userId, userName, items } = req.body;
  const newOrder: Order = {
    id: uuidv4(),
    userId,
    userName,
    items,
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  }

  res.status(201).json(newOrder);
});

app.get('/api/orders', (req, res) => {
  const { userId } = req.query;
  if (userId) {
    const userOrders = orders.filter((o) => o.userId === userId);
    return res.json(userOrders);
  }
  res.json(orders);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const orderIndex = orders.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  const order = orders[orderIndex];
  for (const item of order.items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock += item.quantity;
    }
  }
  orders.splice(orderIndex, 1);
  res.json({ success: true });
});

app.get('/api/merged-orders', (req, res) => {
  res.json(getMergedOrders());
});

app.patch('/api/merged-orders/:productId/pickup', (req, res) => {
  const { productId } = req.params;
  const { userId, picked } = req.body;

  if (!pickupStatus[productId]) {
    pickupStatus[productId] = {};
  }
  pickupStatus[productId][userId] = {
    picked,
    pickedAt: picked ? new Date().toISOString() : undefined,
  };

  res.json(getMergedOrders());
});

app.get('/api/categories', (req, res) => {
  const categories = Array.from(new Set(products.map((p) => p.category)));
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
