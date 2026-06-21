import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Item, User, Notification, ExchangeType } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

let items: Item[] = [];
let users: User[] = [];
let notifications: Notification[] = [];

const sampleImages = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=old%20textbook%20stack%20education%20university&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20fan%20small%20appliance&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=daily%20necessities%20plastic%20storage%20box&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=computer%20mouse%20electronic%20device&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=coffee%20mug%20ceramic%20cup&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=backpack%20bag%20student&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=desk%20lamp%20study%20light&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=notebook%20stationery%20paper&image_size=square'
];

function initializeMockData() {
  users = [
    {
      id: 'user-001',
      name: '小明同学',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
      points: 280,
      publishedItems: ['item-001', 'item-002', 'item-003'],
      favoriteItems: ['item-004', 'item-007']
    },
    {
      id: 'user-002',
      name: '毕业学长',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=graduate',
      points: 520,
      publishedItems: ['item-004', 'item-005', 'item-006'],
      favoriteItems: ['item-001']
    },
    {
      id: 'user-003',
      name: '图书馆常客',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reader',
      points: 150,
      publishedItems: ['item-007', 'item-008', 'item-009', 'item-010'],
      favoriteItems: ['item-002', 'item-005']
    }
  ];

  items = [
    {
      id: 'item-001',
      name: '高等数学教材（第七版）',
      description: '同济大学数学系编，考研复习必备教材。书本保持完好，只有少量笔记标注，适合大一新生或考研复习使用。附赠课后习题解答电子版。',
      images: [sampleImages[0], sampleImages[1]],
      condition: 4,
      exchangeType: 'exchange',
      userId: 'user-001',
      userName: '小明同学',
      status: 'waiting',
      views: 128,
      likes: 15,
      likedBy: ['user-002'],
      createdAt: Date.now() - 86400000 * 2,
      expectCondition: '希望能换到一本英语六级词汇书'
    },
    {
      id: 'item-002',
      name: 'USB小风扇',
      description: '便携式USB小风扇，三档风力调节，静音设计，夏天宿舍必备。使用了半年，功能完好，成色较新。',
      images: [sampleImages[1], sampleImages[2]],
      condition: 5,
      exchangeType: 'gift',
      userId: 'user-001',
      userName: '小明同学',
      status: 'waiting',
      views: 89,
      likes: 23,
      likedBy: ['user-003'],
      createdAt: Date.now() - 86400000 * 1
    },
    {
      id: 'item-003',
      name: '桌面收纳盒套装',
      description: '三件套桌面收纳盒，透明塑料材质，可收纳文具、化妆品等小物件。帮助你保持桌面整洁有序。',
      images: [sampleImages[2]],
      condition: 3,
      exchangeType: 'sell',
      userId: 'user-001',
      userName: '小明同学',
      status: 'sent',
      views: 56,
      likes: 8,
      likedBy: [],
      createdAt: Date.now() - 86400000 * 5,
      expectCondition: '15元'
    },
    {
      id: 'item-004',
      name: '无线鼠标',
      description: '小米无线鼠标Lite，静音按键，人体工学设计，续航可达6个月。使用一年，功能正常，底部有轻微划痕。',
      images: [sampleImages[3], sampleImages[0]],
      condition: 4,
      exchangeType: 'exchange',
      userId: 'user-002',
      userName: '毕业学长',
      status: 'waiting',
      views: 210,
      likes: 35,
      likedBy: ['user-001'],
      createdAt: Date.now() - 86400000 * 3,
      expectCondition: '可交换同等价值的物品或25元'
    },
    {
      id: 'item-005',
      name: '陶瓷马克杯',
      description: '星巴克城市限定款马克杯，容量355ml，杯身有精美城市图案。全新未使用，包装完好，收藏送礼两相宜。',
      images: [sampleImages[4], sampleImages[1]],
      condition: 5,
      exchangeType: 'gift',
      userId: 'user-002',
      userName: '毕业学长',
      status: 'expired',
      views: 167,
      likes: 42,
      likedBy: ['user-003'],
      createdAt: Date.now() - 86400000 * 10
    },
    {
      id: 'item-006',
      name: '双肩背包',
      description: 'JanSport经典款双肩包，大容量多隔层，防水面料。使用两年，有正常使用痕迹但无破损，适合通勤上学。',
      images: [sampleImages[5], sampleImages[2]],
      condition: 3,
      exchangeType: 'sell',
      userId: 'user-002',
      userName: '毕业学长',
      status: 'waiting',
      views: 145,
      likes: 19,
      likedBy: [],
      createdAt: Date.now() - 86400000 * 4,
      expectCondition: '50元'
    },
    {
      id: 'item-007',
      name: 'LED护眼台灯',
      description: '小米米家LED台灯，无极调光调色，护眼无频闪，支持手机APP控制。使用一年半，功能完好，配件齐全。',
      images: [sampleImages[6], sampleImages[3]],
      condition: 4,
      exchangeType: 'exchange',
      userId: 'user-003',
      userName: '图书馆常客',
      status: 'waiting',
      views: 312,
      likes: 56,
      likedBy: ['user-001'],
      createdAt: Date.now() - 86400000 * 1,
      expectCondition: '希望换一个机械键盘或80元'
    },
    {
      id: 'item-008',
      name: '笔记本套装（5本）',
      description: '晨光A5笔记本，每本80页，横线内页，纸张顺滑不洇墨。全新未拆封，适合上课记笔记。',
      images: [sampleImages[7], sampleImages[4]],
      condition: 5,
      exchangeType: 'gift',
      userId: 'user-003',
      userName: '图书馆常客',
      status: 'waiting',
      views: 78,
      likes: 12,
      likedBy: [],
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'item-009',
      name: '《算法导论》第三版',
      description: '算法经典教材，计算机专业必读。书角有轻微折痕，内页干净无笔记。适合算法学习和面试准备。',
      images: [sampleImages[0], sampleImages[5]],
      condition: 4,
      exchangeType: 'sell',
      userId: 'user-003',
      userName: '图书馆常客',
      status: 'waiting',
      views: 256,
      likes: 38,
      likedBy: [],
      createdAt: Date.now() - 86400000 * 3,
      expectCondition: '35元'
    },
    {
      id: 'item-010',
      name: '键盘清洁套装',
      description: '键盘清洁泥+清洁刷+清洁布三件套，有效清除键盘缝隙灰尘。全新未使用，保持你的设备干净如新。',
      images: [sampleImages[3], sampleImages[6]],
      condition: 5,
      exchangeType: 'gift',
      userId: 'user-003',
      userName: '图书馆常客',
      status: 'waiting',
      views: 45,
      likes: 6,
      likedBy: [],
      createdAt: Date.now() - 86400000 * 1
    }
  ];

  notifications = [
    {
      id: 'notif-001',
      userId: 'user-001',
      type: 'like',
      itemId: 'item-001',
      itemName: '高等数学教材（第七版）',
      fromUserName: '毕业学长',
      content: '赞了你的物品',
      read: false,
      createdAt: Date.now() - 3600000
    },
    {
      id: 'notif-002',
      userId: 'user-001',
      type: 'exchange',
      itemId: 'item-002',
      itemName: 'USB小风扇',
      fromUserName: '图书馆常客',
      content: '想要交换你的物品，请问还在吗？',
      read: false,
      createdAt: Date.now() - 7200000
    },
    {
      id: 'notif-003',
      userId: 'user-001',
      type: 'comment',
      itemId: 'item-001',
      itemName: '高等数学教材（第七版）',
      fromUserName: '图书馆常客',
      content: '请问书还在吗？我正好需要！',
      read: true,
      createdAt: Date.now() - 86400000
    },
    {
      id: 'notif-004',
      userId: 'user-002',
      type: 'like',
      itemId: 'item-004',
      itemName: '无线鼠标',
      fromUserName: '小明同学',
      content: '赞了你的物品',
      read: true,
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'notif-005',
      userId: 'user-003',
      type: 'exchange',
      itemId: 'item-007',
      itemName: 'LED护眼台灯',
      fromUserName: '小明同学',
      content: '我有一个机械键盘想和你交换，可以聊聊吗？',
      read: false,
      createdAt: Date.now() - 1800000
    },
    {
      id: 'notif-006',
      userId: 'user-001',
      type: 'like',
      itemId: 'item-002',
      itemName: 'USB小风扇',
      fromUserName: '匿名用户',
      content: '赞了你的物品',
      read: false,
      createdAt: Date.now() - 1800000
    },
    {
      id: 'notif-007',
      userId: 'user-001',
      type: 'comment',
      itemId: 'item-002',
      itemName: 'USB小风扇',
      fromUserName: '匿名用户',
      content: '请问电池续航怎么样？',
      read: false,
      createdAt: Date.now() - 900000
    },
    {
      id: 'notif-008',
      userId: 'user-001',
      type: 'exchange',
      itemId: 'item-001',
      itemName: '高等数学教材（第七版）',
      fromUserName: '匿名用户',
      content: '我有六级词汇书，我们可以交换！',
      read: false,
      createdAt: Date.now() - 600000
    },
    {
      id: 'notif-009',
      userId: 'user-001',
      type: 'like',
      itemId: 'item-003',
      itemName: '桌面收纳盒套装',
      fromUserName: '匿名用户',
      content: '赞了你的物品',
      read: false,
      createdAt: Date.now() - 300000
    },
    {
      id: 'notif-010',
      userId: 'user-001',
      type: 'comment',
      itemId: 'item-001',
      itemName: '高等数学教材（第七版）',
      fromUserName: '匿名用户',
      content: '书还在吗？我是大一新生，急需！',
      read: false,
      createdAt: Date.now() - 120000
    },
    {
      id: 'notif-011',
      userId: 'user-001',
      type: 'exchange',
      itemId: 'item-002',
      itemName: 'USB小风扇',
      fromUserName: '匿名用户',
      content: '想要这个小风扇，可以面交吗？',
      read: false,
      createdAt: Date.now() - 60000
    }
  ];
}

initializeMockData();

app.get('/api/items', (_req: Request, res: Response) => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  res.json({ items: shuffled, total: items.length });
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    item.views += 1;
    res.json(item);
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

app.post('/api/items', upload.array('images', 4), (req: Request, res: Response) => {
  const { name, description, condition, exchangeType, expectCondition, userId, userName } = req.body;
  const files = req.files as Express.Multer.File[];
  
  let images: string[] = [];
  if (files && files.length > 0) {
    images = files.map(file => `/uploads/${file.filename}`);
  } else {
    images = [sampleImages[Math.floor(Math.random() * sampleImages.length)]];
  }

  const newItem: Item = {
    id: `item-${uuidv4().substring(0, 8)}`,
    name,
    description,
    images,
    condition: parseInt(condition),
    exchangeType: exchangeType as ExchangeType,
    userId,
    userName,
    status: 'waiting',
    views: 0,
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
    expectCondition
  };

  items.unshift(newItem);

  const user = users.find(u => u.id === userId);
  if (user) {
    user.publishedItems.unshift(newItem.id);
    user.points += 50;
  }

  res.json({ success: true, item: newItem });
});

app.post('/api/items/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body;
  const item = items.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const likedIndex = item.likedBy.indexOf(userId);
  let liked: boolean;

  if (likedIndex === -1) {
    item.likedBy.push(userId);
    item.likes += 1;
    liked = true;

    if (item.userId !== userId) {
      const notif: Notification = {
        id: `notif-${uuidv4().substring(0, 8)}`,
        userId: item.userId,
        type: 'like',
        itemId: item.id,
        itemName: item.name,
        fromUserName: '匿名用户',
        content: '赞了你的物品',
        read: false,
        createdAt: Date.now()
      };
      notifications.unshift(notif);
    }

    const user = users.find(u => u.id === userId);
    if (user && !user.favoriteItems.includes(item.id)) {
      user.favoriteItems.push(item.id);
    }
  } else {
    item.likedBy.splice(likedIndex, 1);
    item.likes -= 1;
    liked = false;

    const user = users.find(u => u.id === userId);
    if (user) {
      const favIndex = user.favoriteItems.indexOf(item.id);
      if (favIndex !== -1) {
        user.favoriteItems.splice(favIndex, 1);
      }
    }
  }

  res.json({ success: true, liked, likes: item.likes });
});

app.post('/api/items/:id/exchange', (req: Request, res: Response) => {
  const { userId, userName, message } = req.body;
  const item = items.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const notif: Notification = {
    id: `notif-${uuidv4().substring(0, 8)}`,
    userId: item.userId,
    type: 'exchange',
    itemId: item.id,
    itemName: item.name,
    fromUserName: userName || '匿名用户',
    content: message || '想要交换你的物品',
    read: false,
    createdAt: Date.now()
  };
  notifications.unshift(notif);

  const user = users.find(u => u.id === userId);
  if (user) {
    user.points += 10;
  }

  res.json({ success: true });
});

app.post('/api/items/:id/comment', (req: Request, res: Response) => {
  const { userId, userName, content } = req.body;
  const item = items.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const notif: Notification = {
    id: `notif-${uuidv4().substring(0, 8)}`,
    userId: item.userId,
    type: 'comment',
    itemId: item.id,
    itemName: item.name,
    fromUserName: userName || '匿名用户',
    content,
    read: false,
    createdAt: Date.now()
  };
  notifications.unshift(notif);

  res.json({ success: true });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (user) {
    res.json(user);
  } else {
    const newUser: User = {
      id: req.params.id,
      name: '匿名用户',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.params.id}`,
      points: 100,
      publishedItems: [],
      favoriteItems: []
    };
    users.push(newUser);
    res.json(newUser);
  }
});

app.get('/api/users/:id/items', (req: Request, res: Response) => {
  const userItems = items
    .filter(i => i.userId === req.params.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(userItems);
});

app.get('/api/users/:id/favorites', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (user) {
    const favoriteItems = items.filter(i => user.favoriteItems.includes(i.id));
    res.json(favoriteItems);
  } else {
    res.json([]);
  }
});

app.get('/api/notifications/:userId', (req: Request, res: Response) => {
  const userNotifications = notifications
    .filter(n => n.userId === req.params.userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(userNotifications);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

app.get('/api/notifications/:userId/unread-count', (req: Request, res: Response) => {
  const count = notifications.filter(
    n => n.userId === req.params.userId && !n.read
  ).length;
  res.json({ count });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
