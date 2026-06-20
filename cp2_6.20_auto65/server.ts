import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type MemberLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface Member {
  id: string;
  nickname: string;
  email: string;
  totalSpent: number;
  level: MemberLevel;
  orderHistory: Order[];
  createdAt: number;
}

interface Topping {
  id: string;
  name: string;
  price: number;
}

interface Drink {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
}

interface OrderItem {
  drink: Drink;
  toppings: Topping[];
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  memberId: string | null;
  items: OrderItem[];
  totalPrice: number;
  queueNumber: number;
  status: 'queued' | 'preparing' | 'ready' | 'completed';
  estimatedWaitMinutes: number;
  createdAt: number;
}

const toppings: Topping[] = [
  { id: 'extra_shot', name: '额外浓缩', price: 5 },
  { id: 'oat_milk', name: '燕麦奶', price: 4 },
  { id: 'caramel', name: '焦糖酱', price: 3 },
];

const drinks: Drink[] = [
  {
    id: 'd1',
    name: '经典美式',
    description: '浓郁醇厚的意式浓缩搭配热水，唤醒你的一天',
    price: 22,
    category: '咖啡',
    image: '☕',
    tags: ['经典', '提神'],
  },
  {
    id: 'd2',
    name: '香草拿铁',
    description: '丝滑牛奶与香草的甜蜜交融，温柔你的味蕾',
    price: 28,
    category: '咖啡',
    image: '🥛',
    tags: ['奶香', '甜口'],
  },
  {
    id: 'd3',
    name: '焦糖玛奇朵',
    description: '焦糖与咖啡的浪漫邂逅，层次丰富',
    price: 30,
    category: '咖啡',
    image: '🍮',
    tags: ['焦糖', '招牌'],
  },
  {
    id: 'd4',
    name: '抹茶拿铁',
    description: '来自宇治的抹茶与牛奶的完美结合',
    price: 26,
    category: '茶饮',
    image: '🍵',
    tags: ['抹茶', '清新'],
  },
  {
    id: 'd5',
    name: '可可摩卡',
    description: '浓郁巧克力与咖啡的双重享受',
    price: 32,
    category: '咖啡',
    image: '🍫',
    tags: ['巧克力', '浓郁'],
  },
  {
    id: 'd6',
    name: '冰摇柠檬茶',
    description: '清新柠檬与红茶的碰撞，夏日必备',
    price: 20,
    category: '茶饮',
    image: '🍋',
    tags: ['清爽', '果味'],
  },
];

const members: Map<string, Member> = new Map();
const orders: Order[] = [];
let queueCounter = 0;

const calculateLevel = (totalSpent: number): MemberLevel => {
  if (totalSpent >= 1000) return 'diamond';
  if (totalSpent >= 500) return 'platinum';
  if (totalSpent >= 200) return 'gold';
  if (totalSpent >= 100) return 'silver';
  return 'bronze';
};

const generateId = (): string => Math.random().toString(36).slice(2, 10);

const calculateWaitTime = (index: number): number => {
  return Math.max(1, Math.ceil(index * 1.5));
};

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/drinks', (_req: Request, res: Response) => {
  res.json({ drinks, toppings });
});

app.post('/api/members/register', (req: Request, res: Response) => {
  const { nickname, email } = req.body;
  if (!nickname || !email) {
    return res.status(400).json({ error: '昵称和邮箱不能为空' });
  }
  for (const member of members.values()) {
    if (member.email === email) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }
  }
  const member: Member = {
    id: generateId(),
    nickname,
    email,
    totalSpent: 0,
    level: 'bronze',
    orderHistory: [],
    createdAt: Date.now(),
  };
  members.set(member.id, member);
  res.json({ member });
});

app.post('/api/members/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: '邮箱不能为空' });
  }
  for (const member of members.values()) {
    if (member.email === email) {
      return res.json({ member });
    }
  }
  res.status(404).json({ error: '未找到该会员，请先注册' });
});

app.get('/api/members/:id', (req: Request, res: Response) => {
  const member = members.get(req.params.id);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  res.json({ member });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { memberId, items } = req.body as { memberId?: string; items: OrderItem[] };
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '订单不能为空' });
  }

  const totalPrice = items.reduce((sum, item) => {
    const toppingsPrice = item.toppings.reduce((s, t) => s + t.price, 0);
    return sum + (item.drink.price + toppingsPrice) * item.quantity;
  }, 0);

  queueCounter++;
  const queuedOrders = orders.filter((o) => o.status === 'queued' || o.status === 'preparing');
  const queueIndex = queuedOrders.length;

  const order: Order = {
    id: generateId(),
    memberId: memberId || null,
    items,
    totalPrice,
    queueNumber: queueCounter,
    status: 'queued',
    estimatedWaitMinutes: calculateWaitTime(queueIndex),
    createdAt: Date.now(),
  };

  orders.push(order);

  if (memberId) {
    const member = members.get(memberId);
    if (member) {
      member.totalSpent += totalPrice;
      member.level = calculateLevel(member.totalSpent);
      member.orderHistory.push(order);
    }
  }

  setTimeout(() => {
    const o = orders.find((x) => x.id === order.id);
    if (o) o.status = 'preparing';
  }, 3000);

  setTimeout(() => {
    const o = orders.find((x) => x.id === order.id);
    if (o) o.status = 'ready';
  }, 8000);

  res.json({ order, queueLength: orders.filter((o) => o.status === 'queued').length });
});

app.get('/api/orders/queue', (_req: Request, res: Response) => {
  const activeOrders = orders
    .filter((o) => o.status !== 'completed')
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({
    orders: activeOrders,
    queueLength: activeOrders.filter((o) => o.status === 'queued').length,
  });
});

app.post('/api/orders/:id/complete', (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  order.status = 'completed';
  res.json({ order });
});

app.get('/api/members/:id/recommendations', (req: Request, res: Response) => {
  const member = members.get(req.params.id);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }

  if (member.orderHistory.length === 0) {
    const popular = drinks.slice(0, 2).map((d) => ({
      drink: d,
      reason: '本店招牌人气饮品',
    }));
    return res.json({ recommendations: popular });
  }

  const categoryCount: Record<string, number> = {};
  const drinkCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};

  for (const order of member.orderHistory) {
    for (const item of order.items) {
      categoryCount[item.drink.category] = (categoryCount[item.drink.category] || 0) + 1;
      drinkCount[item.drink.id] = (drinkCount[item.drink.id] || 0) + 1;
      for (const tag of item.drink.tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
  }

  const orderedDrinkIds = new Set(Object.keys(drinkCount));
  const scoredDrinks = drinks
    .filter((d) => !orderedDrinkIds.has(d.id))
    .map((d) => {
      let score = 0;
      let reasons: string[] = [];
      if (categoryCount[d.category]) {
        score += categoryCount[d.category] * 2;
        reasons.push(`与你常喝的${d.category}口味相似`);
      }
      for (const tag of d.tags) {
        if (tagCount[tag]) {
          score += tagCount[tag];
          if (reasons.length === 0) reasons.push(`你喜欢${tag}口味`);
        }
      }
      return { drink: d, score, reason: reasons[0] || '本店人气推荐' };
    })
    .sort((a, b) => b.score - a.score);

  const recommendations =
    scoredDrinks.length >= 2
      ? scoredDrinks.slice(0, 2)
      : [
          ...scoredDrinks,
          ...drinks
            .filter((d) => d.id !== scoredDrinks[0]?.drink.id)
            .slice(0, 2 - scoredDrinks.length)
            .map((d) => ({ drink: d, reason: '热门推荐' })),
        ];

  res.json({ recommendations });
});

app.listen(PORT, () => {
  console.log(`☕ 咖啡馆后端服务已启动: http://localhost:${PORT}`);
});
