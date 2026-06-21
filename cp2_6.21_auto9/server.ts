import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Member {
  id: string;
  nickname: string;
  email: string;
  level: MemberLevel;
  totalSpent: number;
  points: number;
  createdAt: string;
}

type MemberLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface Drink {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  icon: string;
}

interface Topping {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  drinkId: string;
  drinkName: string;
  price: number;
  toppings: string[];
  toppingNames: string[];
}

interface Order {
  id: string;
  orderNumber: number;
  memberId: string;
  items: OrderItem[];
  status: 'queued' | 'preparing' | 'ready' | 'completed';
  queuePosition: number;
  estimatedWaitTime: number;
  totalPrice: number;
  createdAt: string;
}

interface Recommendation {
  drinkId: string;
  drinkName: string;
  reason: string;
  icon: string;
  price: number;
}

const members: Member[] = [];
const drinks: Drink[] = [
  { id: 'd1', name: '美式咖啡', price: 22, description: '经典美式，醇厚香浓', category: '咖啡', icon: '☕' },
  { id: 'd2', name: '拿铁', price: 28, description: '丝滑牛奶与浓缩的完美融合', category: '咖啡', icon: '🥛' },
  { id: 'd3', name: '卡布奇诺', price: 26, description: '绵密奶泡，意式经典', category: '咖啡', icon: '☕' },
  { id: 'd4', name: '摩卡', price: 30, description: '巧克力与咖啡的甜蜜邂逅', category: '咖啡', icon: '🍫' },
  { id: 'd5', name: '焦糖玛奇朵', price: 32, description: '焦糖风味，层次丰富', category: '咖啡', icon: '🍮' },
  { id: 'd6', name: '抹茶拿铁', price: 30, description: '日式抹茶，清新怡人', category: '茶饮', icon: '🍵' },
];

const toppings: Topping[] = [
  { id: 't1', name: '额外浓缩', price: 5 },
  { id: 't2', name: '燕麦奶', price: 6 },
  { id: 't3', name: '焦糖酱', price: 4 },
];

const orders: Order[] = [];
let orderNumberCounter = 100;
const memberOrderHistory: Map<string, string[]> = new Map();

function calculateLevel(totalSpent: number): MemberLevel {
  if (totalSpent >= 1500) return 'diamond';
  if (totalSpent >= 700) return 'platinum';
  if (totalSpent >= 300) return 'gold';
  if (totalSpent >= 100) return 'silver';
  return 'bronze';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function updateQueuePositions(): void {
  const activeOrders = orders.filter(o => o.status !== 'completed');
  activeOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  activeOrders.forEach((order, index) => {
    order.queuePosition = index + 1;
    order.estimatedWaitTime = Math.ceil((index + 1) * 3);
  });
}

function getDrinkById(id: string): Drink | undefined {
  return drinks.find(d => d.id === id);
}

function getToppingById(id: string): Topping | undefined {
  return toppings.find(t => t.id === id);
}

app.post('/api/members/register', (req: Request, res: Response) => {
  const { nickname, email } = req.body;

  if (!nickname || !email) {
    return res.status(400).json({ error: '昵称和邮箱不能为空' });
  }

  const existingMember = members.find(m => m.email === email);
  if (existingMember) {
    return res.status(409).json({ error: '该邮箱已注册' });
  }

  const member: Member = {
    id: generateId(),
    nickname,
    email,
    level: 'bronze',
    totalSpent: 0,
    points: 0,
    createdAt: new Date().toISOString(),
  };

  members.push(member);
  memberOrderHistory.set(member.id, []);

  res.json(member);
});

app.post('/api/members/login', (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: '邮箱不能为空' });
  }

  const member = members.find(m => m.email === email);
  if (!member) {
    return res.status(404).json({ error: '会员不存在，请先注册' });
  }

  res.json(member);
});

app.get('/api/members/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const member = members.find(m => m.id === id);

  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }

  res.json(member);
});

app.get('/api/menu', (_req: Request, res: Response) => {
  res.json(drinks);
});

app.get('/api/toppings', (_req: Request, res: Response) => {
  res.json(toppings);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { memberId, items } = req.body;

  if (!memberId || !items || items.length === 0) {
    return res.status(400).json({ error: '订单信息不完整' });
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }

  let totalPrice = 0;
  const orderItems: OrderItem[] = items.map((item: { drinkId: string; toppings: string[] }) => {
    const drink = getDrinkById(item.drinkId);
    if (!drink) {
      throw new Error('饮品不存在');
    }

    let itemPrice = drink.price;
    const toppingNames: string[] = [];

    item.toppings.forEach(toppingId => {
      const topping = getToppingById(toppingId);
      if (topping) {
        itemPrice += topping.price;
        toppingNames.push(topping.name);
      }
    });

    totalPrice += itemPrice;

    return {
      id: generateId(),
      drinkId: item.drinkId,
      drinkName: drink.name,
      price: itemPrice,
      toppings: item.toppings,
      toppingNames,
    };
  });

  const order: Order = {
    id: generateId(),
    orderNumber: orderNumberCounter++,
    memberId,
    items: orderItems,
    status: 'queued',
    queuePosition: 0,
    estimatedWaitTime: 0,
    totalPrice,
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  updateQueuePositions();

  member.totalSpent += totalPrice;
  member.points += Math.floor(totalPrice);
  member.level = calculateLevel(member.totalSpent);

  const history = memberOrderHistory.get(memberId) || [];
  items.forEach((item: { drinkId: string }) => {
    history.push(item.drinkId);
  });
  memberOrderHistory.set(memberId, history);

  res.status(201).json(order);
});

app.get('/api/orders/queue', (_req: Request, res: Response) => {
  updateQueuePositions();
  const activeOrders = orders.filter(o => o.status !== 'completed');
  const queuedOrders = activeOrders.map(({ id, orderNumber, status, queuePosition, estimatedWaitTime }) => ({
    id,
    orderNumber,
    status,
    queuePosition,
    estimatedWaitTime,
  }));

  res.json({
    totalInQueue: activeOrders.length,
    orders: queuedOrders,
  });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  res.json(order);
});

app.get('/api/recommendations/:memberId', (req: Request, res: Response) => {
  const { memberId } = req.params;
  const history = memberOrderHistory.get(memberId) || [];

  if (history.length === 0) {
    const recommendations: Recommendation[] = drinks.slice(0, 2).map(drink => ({
      drinkId: drink.id,
      drinkName: drink.name,
      reason: '本店招牌，人气之选',
      icon: drink.icon,
      price: drink.price,
    }));
    return res.json(recommendations);
  }

  const drinkCount: Map<string, number> = new Map();
  history.forEach(drinkId => {
    drinkCount.set(drinkId, (drinkCount.get(drinkId) || 0) + 1);
  });

  const sortedDrinkIds = Array.from(drinkCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const recommendations: Recommendation[] = [];
  const usedIds = new Set<string>();

  for (const drinkId of sortedDrinkIds) {
    if (recommendations.length >= 2) break;
    const drink = getDrinkById(drinkId);
    if (drink) {
      recommendations.push({
        drinkId: drink.id,
        drinkName: drink.name,
        reason: '根据您的口味偏好推荐',
        icon: drink.icon,
        price: drink.price,
      });
      usedIds.add(drink.id);
    }
  }

  if (recommendations.length < 2) {
    for (const drink of drinks) {
      if (recommendations.length >= 2) break;
      if (!usedIds.has(drink.id)) {
        recommendations.push({
          drinkId: drink.id,
          drinkName: drink.name,
          reason: '新品上市，欢迎品尝',
          icon: drink.icon,
          price: drink.price,
        });
      }
    }
  }

  res.json(recommendations);
});

app.listen(PORT, () => {
  console.log(`Coffee shop server running on http://localhost:${PORT}`);
});
