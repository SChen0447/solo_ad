import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: 'electronics' | 'books' | 'home' | 'clothing' | 'other';
  desiredTags: string[];
  ownerId: string;
  ownerNickname: string;
  ownerCreditScore: number;
  createdAt: Date;
}

interface User {
  id: string;
  nickname: string;
  avatar: string;
  creditScore: number;
}

interface Exchange {
  id: string;
  fromItemId: string;
  toItemId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface CreditRecord {
  id: string;
  userId: string;
  partnerNickname: string;
  itemName: string;
  exchangeTime: Date;
  scoreChange: number;
}

const users: User[] = [
  { id: 'user1', nickname: '小明', avatar: '', creditScore: 92 },
  { id: 'user2', nickname: '小红', avatar: '', creditScore: 65 },
  { id: 'user3', nickname: '小刚', avatar: '', creditScore: 45 },
];

const items: Item[] = [
  {
    id: 'item1',
    title: 'iPhone 12 Pro 手机',
    description: '自用iPhone 12 Pro 256G，成色9成新，无磕碰，功能完好。',
    imageUrl: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400',
    category: 'electronics',
    desiredTags: ['华为手机', '小米手机', '平板'],
    ownerId: 'user1',
    ownerNickname: '小明',
    ownerCreditScore: 92,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'item2',
    title: '《深入理解计算机系统》',
    description: '经典计算机书籍，CSAPP第三版，中文译本，品相良好。',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    category: 'books',
    desiredTags: ['算法导论', '操作系统', '编程书籍'],
    ownerId: 'user2',
    ownerNickname: '小红',
    ownerCreditScore: 65,
    createdAt: new Date('2024-01-18'),
  },
  {
    id: 'item3',
    title: '宜家实木书桌',
    description: '宜家实木书桌，尺寸120x60cm，使用一年，搬家转让。',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400',
    category: 'home',
    desiredTags: ['办公椅', '书架', '电脑桌'],
    ownerId: 'user3',
    ownerNickname: '小刚',
    ownerCreditScore: 45,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'item4',
    title: 'Nike Air Max 运动鞋',
    description: 'Nike Air Max 90，尺码42，穿过两次，几乎全新。',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    category: 'clothing',
    desiredTags: ['Adidas球鞋', 'New Balance', '休闲鞋'],
    ownerId: 'user1',
    ownerNickname: '小明',
    ownerCreditScore: 92,
    createdAt: new Date('2024-01-22'),
  },
  {
    id: 'item5',
    title: '索尼 WH-1000XM4 降噪耳机',
    description: '索尼旗舰降噪耳机，音质出色，降噪效果极佳，配件齐全。',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'electronics',
    desiredTags: ['Bose耳机', 'AirPods Pro', '音响'],
    ownerId: 'user2',
    ownerNickname: '小红',
    ownerCreditScore: 65,
    createdAt: new Date('2024-01-25'),
  },
  {
    id: 'item6',
    title: 'Kindle Paperwhite 电子书阅读器',
    description: 'Kindle Paperwhite第10代，8G内存，带阅读灯，护眼首选。',
    imageUrl: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=400',
    category: 'electronics',
    desiredTags: ['纸质书籍', '电子书', '阅读器'],
    ownerId: 'user1',
    ownerNickname: '小明',
    ownerCreditScore: 92,
    createdAt: new Date('2024-01-28'),
  },
  {
    id: 'item7',
    title: '北欧风台灯',
    description: '简约北欧风格LED台灯，三档亮度调节，护眼暖光。',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'home',
    desiredTags: ['落地灯', '壁灯', '氛围灯'],
    ownerId: 'user3',
    ownerNickname: '小刚',
    ownerCreditScore: 45,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'item8',
    title: '优衣库羽绒服',
    description: '优衣库男款轻薄羽绒服，L码，黑色，保暖效果好。',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
    category: 'clothing',
    desiredTags: ['冲锋衣', '棉服', '夹克'],
    ownerId: 'user2',
    ownerNickname: '小红',
    ownerCreditScore: 65,
    createdAt: new Date('2024-02-05'),
  },
];

const exchanges: Exchange[] = [];

const creditRecords: CreditRecord[] = [
  {
    id: 'cr1',
    userId: 'user1',
    partnerNickname: '小李',
    itemName: 'MacBook Pro笔记本',
    exchangeTime: new Date('2024-01-10'),
    scoreChange: 5,
  },
  {
    id: 'cr2',
    userId: 'user1',
    partnerNickname: '小张',
    itemName: 'iPad Air平板',
    exchangeTime: new Date('2024-01-05'),
    scoreChange: 5,
  },
  {
    id: 'cr3',
    userId: 'user1',
    partnerNickname: '小王',
    itemName: '机械键盘',
    exchangeTime: new Date('2023-12-28'),
    scoreChange: 5,
  },
  {
    id: 'cr4',
    userId: 'user2',
    partnerNickname: '小赵',
    itemName: '电子书',
    exchangeTime: new Date('2024-01-12'),
    scoreChange: 5,
  },
  {
    id: 'cr5',
    userId: 'user2',
    partnerNickname: '小孙',
    itemName: '耳机',
    exchangeTime: new Date('2024-01-08'),
    scoreChange: 5,
  },
];

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const matchItems = (targetItem: Item, allItems: Item[], limit: number = 5): Item[] => {
  const scored = allItems
    .filter((item) => item.id !== targetItem.id)
    .map((item) => {
      let score = 0;
      const searchText = (item.title + ' ' + item.description).toLowerCase();
      targetItem.desiredTags.forEach((tag) => {
        if (searchText.includes(tag.toLowerCase())) {
          score += 1;
        }
      });
      item.desiredTags.forEach((tag) => {
        if ((targetItem.title + ' ' + targetItem.description).toLowerCase().includes(tag.toLowerCase())) {
          score += 1;
        }
      });
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);

  return scored;
};

const updateCreditScore = (userId: string, delta: number): void => {
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.creditScore = Math.max(0, Math.min(100, user.creditScore + delta));
    items.forEach((item) => {
      if (item.ownerId === userId) {
        item.ownerCreditScore = user.creditScore;
      }
    });
  }
};

app.get('/api/items', (req, res) => {
  const query = (req.query.query as string) || '';
  const category = (req.query.category as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 20;

  let filtered = items;

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'all') {
    filtered = filtered.filter((item) => item.category === category);
  }

  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const response: ApiResponse<{ items: Item[]; total: number }> = {
    success: true,
    data: { items: paginated, total: filtered.length },
    message: '获取物品列表成功',
  };
  res.json(response);
});

app.post('/api/items', (req, res) => {
  const { title, description, imageUrl, category, desiredTags, ownerId } = req.body;

  const owner = users.find((u) => u.id === ownerId) || users[0];

  const newItem: Item = {
    id: uuidv4(),
    title,
    description,
    imageUrl,
    category,
    desiredTags,
    ownerId: owner.id,
    ownerNickname: owner.nickname,
    ownerCreditScore: owner.creditScore,
    createdAt: new Date(),
  };

  items.unshift(newItem);

  const recommendations = matchItems(newItem, items, 5);

  const response: ApiResponse<{ item: Item; recommendations: Item[] }> = {
    success: true,
    data: { item: newItem, recommendations },
    message: '发布物品成功',
  };
  res.json(response);
});

app.get('/api/items/:id', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);

  if (!item) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '物品不存在',
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Item> = {
    success: true,
    data: item,
    message: '获取物品详情成功',
  };
  res.json(response);
});

app.get('/api/items/:id/recommendations', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);

  if (!item) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '物品不存在',
    };
    return res.status(404).json(response);
  }

  const recommendations = matchItems(item, items, 5);

  const response: ApiResponse<Item[]> = {
    success: true,
    data: recommendations,
    message: '获取推荐成功',
  };
  res.json(response);
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);

  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '用户不存在',
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<User> = {
    success: true,
    data: user,
    message: '获取用户信息成功',
  };
  res.json(response);
});

app.get('/api/users/:id/creditHistory', (req, res) => {
  const records = creditRecords
    .filter((r) => r.userId === req.params.id)
    .sort((a, b) => new Date(b.exchangeTime).getTime() - new Date(a.exchangeTime).getTime())
    .slice(0, 5);

  const response: ApiResponse<CreditRecord[]> = {
    success: true,
    data: records,
    message: '获取信用历史成功',
  };
  res.json(response);
});

app.post('/api/exchanges', (req, res) => {
  const { fromItemId, toItemId, fromUserId, toUserId } = req.body;

  const newExchange: Exchange = {
    id: uuidv4(),
    fromItemId,
    toItemId,
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: new Date(),
  };

  exchanges.push(newExchange);

  const response: ApiResponse<Exchange> = {
    success: true,
    data: newExchange,
    message: '创建交换请求成功',
  };
  res.json(response);
});

app.put('/api/exchanges/:id', (req, res) => {
  const { status } = req.body;
  const exchange = exchanges.find((e) => e.id === req.params.id);

  if (!exchange) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '交换请求不存在',
    };
    return res.status(404).json(response);
  }

  exchange.status = status;

  if (status === 'accepted') {
    updateCreditScore(exchange.fromUserId, 5);
    updateCreditScore(exchange.toUserId, 5);

    const fromItem = items.find((i) => i.id === exchange.fromItemId);
    const toItem = items.find((i) => i.id === exchange.toItemId);
    const fromUser = users.find((u) => u.id === exchange.fromUserId);
    const toUser = users.find((u) => u.id === exchange.toUserId);

    if (fromItem && toItem && fromUser && toUser) {
      creditRecords.push({
        id: uuidv4(),
        userId: exchange.fromUserId,
        partnerNickname: toUser.nickname,
        itemName: toItem.title,
        exchangeTime: new Date(),
        scoreChange: 5,
      });
      creditRecords.push({
        id: uuidv4(),
        userId: exchange.toUserId,
        partnerNickname: fromUser.nickname,
        itemName: fromItem.title,
        exchangeTime: new Date(),
        scoreChange: 5,
      });
    }
  }

  const response: ApiResponse<Exchange> = {
    success: true,
    data: exchange,
    message: '更新交换状态成功',
  };
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
