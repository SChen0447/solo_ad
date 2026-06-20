import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

interface ExchangeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  message: string;
  createdAt: string;
}

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  createdAt: string;
  exchangeRequests: ExchangeRequest[];
}

interface Answer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  likedBy: Set<string>;
  replies: Answer[];
  createdAt: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  answers: Answer[];
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

const items = new Map<string, Item>();
const questions = new Map<string, Question>();
const users = new Map<string, UserProfile>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function initSeedData() {
  const seedUsers: UserProfile[] = [
    { id: 'user1', name: '小王', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
    { id: 'user2', name: '阿李', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
    { id: 'user3', name: '大张', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster' },
    { id: 'user4', name: '小陈', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke' },
  ];
  seedUsers.forEach(u => users.set(u.id, u));

  const seedItems: Item[] = [
    {
      id: 'item1', title: '九成新Kindle Paperwhite', description: '买了半年，基本没怎么用，屏幕无划痕，带原装皮套。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kindle%20paperwhite%20e-reader%20on%20wooden%20desk%20clean%20product%20photo&image_size=landscape_4_3',
      condition: '九成新', ownerId: 'user1', ownerName: '小王', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      createdAt: '2026-06-18T10:00:00Z', exchangeRequests: [],
    },
    {
      id: 'item2', title: '宜家Billy书架 白色', description: '搬家出闲置，80cm宽的白色书架，有小磕碰但不影响使用。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ikea%20billy%20white%20bookshelf%20in%20living%20room%20scandinavian%20style&image_size=portrait_4_3',
      condition: '七成新', ownerId: 'user2', ownerName: '阿李', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
      createdAt: '2026-06-17T14:30:00Z', exchangeRequests: [],
    },
    {
      id: 'item3', title: '飞利浦电动牙刷', description: '用了三个月，因为换了新款所以闲置，刷头全新未拆封。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=philips%20electric%20toothbrush%20on%20bathroom%20counter%20clean%20product%20photo&image_size=landscape_4_3',
      condition: '八成新', ownerId: 'user3', ownerName: '大张', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
      createdAt: '2026-06-16T09:15:00Z', exchangeRequests: [],
    },
    {
      id: 'item4', title: '乐高城市系列警局', description: '孩子长大了不玩了，缺两个小零件，整体完整。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20city%20police%20station%20set%20on%20table%20colorful%20toy&image_size=landscape_4_3',
      condition: '八成新', ownerId: 'user4', ownerName: '小陈', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke',
      createdAt: '2026-06-15T16:00:00Z', exchangeRequests: [],
    },
    {
      id: 'item5', title: '瑜伽垫 紫色', description: '只用过几次，6mm厚度，防滑效果好，带收纳带。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=purple%20yoga%20mat%20rolled%20in%20bright%20room%20minimalist%20style&image_size=landscape_4_3',
      condition: '九成新', ownerId: 'user1', ownerName: '小王', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      createdAt: '2026-06-14T11:20:00Z', exchangeRequests: [],
    },
    {
      id: 'item6', title: '小米台灯Pro', description: '护眼台灯，色温可调，功能一切正常，无损坏。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=xiaomi%20desk%20lamp%20pro%20on%20study%20desk%20modern%20minimal&image_size=landscape_4_3',
      condition: '九成新', ownerId: 'user2', ownerName: '阿李', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
      createdAt: '2026-06-13T08:45:00Z', exchangeRequests: [],
    },
    {
      id: 'item7', title: '料理机 破壁机', description: '九阳破壁机，用了一个月，声音比预期大但打得很细。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blender%20kitchen%20appliance%20on%20countertop%20modern%20kitchen&image_size=landscape_4_3',
      condition: '八成新', ownerId: 'user3', ownerName: '大张', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
      createdAt: '2026-06-12T13:30:00Z', exchangeRequests: [],
    },
    {
      id: 'item8', title: '儿童自行车 16寸', description: '适合3-6岁小朋友，粉色，辅助轮可拆卸。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kids%20pink%20bicycle%2016%20inch%20in%20park%20sunny%20day&image_size=landscape_4_3',
      condition: '七成新', ownerId: 'user4', ownerName: '小陈', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke',
      createdAt: '2026-06-11T15:10:00Z', exchangeRequests: [],
    },
    {
      id: 'item9', title: '博世电钻套装', description: '12V充电式电钻，含各种钻头和批头，家装必备。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bosch%20cordless%20drill%20set%20in%20case%20power%20tools&image_size=landscape_4_3',
      condition: '八成新', ownerId: 'user1', ownerName: '小王', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      createdAt: '2026-06-10T10:00:00Z', exchangeRequests: [],
    },
    {
      id: 'item10', title: '复古黑胶唱片机', description: '唱片机能用但喇叭偶尔有杂音，适合自己接音箱。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20vinyl%20record%20player%20retro%20wooden%20interior&image_size=landscape_4_3',
      condition: '六成新', ownerId: 'user2', ownerName: '阿李', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
      createdAt: '2026-06-09T17:30:00Z', exchangeRequests: [],
    },
    {
      id: 'item11', title: '真皮双肩包 棕色', description: '头层牛皮，通勤背了半年，质感很好，有自然包浆。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=brown%20leather%20backpack%20on%20chair%20vintage%20style&image_size=landscape_4_3',
      condition: '八成新', ownerId: 'user3', ownerName: '大张', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
      createdAt: '2026-06-08T12:00:00Z', exchangeRequests: [],
    },
    {
      id: 'item12', title: '空气炸锅 4.5L', description: '利仁空气炸锅，4.5L容量，做鸡翅特别好吃。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=air%20fryer%20kitchen%20appliance%20modern%20white%20countertop&image_size=landscape_4_3',
      condition: '九成新', ownerId: 'user4', ownerName: '小陈', ownerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke',
      createdAt: '2026-06-07T09:00:00Z', exchangeRequests: [],
    },
  ];
  seedItems.forEach(i => items.set(i.id, i));

  const seedQuestions: Question[] = [
    {
      id: 'q1', title: '小区门口新开的生鲜店怎么样？', content: '看到小区门口新开了一家生鲜店，有人去买过吗？价格和品质怎么样？', tags: ['生活', '购物'],
      authorId: 'user1', authorName: '小王', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      answers: [
        {
          id: 'a1', content: '去过几次，蔬菜挺新鲜的，价格比超市便宜一点，推荐！', authorId: 'user2', authorName: '阿李', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
          likes: 5, likedBy: new Set(['user1', 'user3']), replies: [
            {
              id: 'a1r1', content: '是的，他们家的鸡蛋也很便宜，比外面便宜1块钱一斤。', authorId: 'user3', authorName: '大张', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
              likes: 2, likedBy: new Set(), replies: [], createdAt: '2026-06-18T11:00:00Z',
            },
          ], createdAt: '2026-06-18T10:30:00Z',
        },
      ], createdAt: '2026-06-18T09:00:00Z',
    },
    {
      id: 'q2', title: '谁家有二手的儿童安全座椅？', content: '宝宝快一岁了，需要买个安全座椅，想问问邻居们有没有闲置的可以交换？', tags: ['二手', '母婴'],
      authorId: 'user4', authorName: '小陈', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke',
      answers: [], createdAt: '2026-06-17T14:00:00Z',
    },
    {
      id: 'q3', title: '小区车位紧张怎么解决？', content: '每天下班回来都没车位，有没有好的解决方案？物业说在协调但一直没消息。', tags: ['物业', '停车'],
      authorId: 'user3', authorName: '大张', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
      answers: [
        {
          id: 'a3', content: '可以试试跟隔壁楼的邻居拼车位，他们白天上班车位空着，你们晚上用。我们楼就有这样的。', authorId: 'user1', authorName: '小王', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
          likes: 8, likedBy: new Set(['user2', 'user3', 'user4']), replies: [], createdAt: '2026-06-16T20:00:00Z',
        },
      ], createdAt: '2026-06-16T18:00:00Z',
    },
    {
      id: 'q4', title: '附近有什么好的遛狗地方推荐？', content: '刚搬到这个小区，养了一只金毛，想问问附近有没有适合遛狗的公园？', tags: ['宠物', '生活'],
      authorId: 'user2', authorName: '阿李', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
      answers: [], createdAt: '2026-06-15T10:30:00Z',
    },
    {
      id: 'q5', title: '家里WiFi信号不好怎么办？', content: '住在6楼，路由器放在客厅，卧室信号特别差，有没有便宜的解决方案？', tags: ['科技', '生活'],
      authorId: 'user1', authorName: '小王', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      answers: [
        {
          id: 'a5', content: '推荐买个WiFi放大器，几十块钱就能解决。或者换一个Mesh路由器，覆盖更均匀。', authorId: 'user3', authorName: '大张', authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
          likes: 3, likedBy: new Set(['user1']), replies: [], createdAt: '2026-06-14T16:00:00Z',
        },
      ], createdAt: '2026-06-14T15:00:00Z',
    },
  ];
  seedQuestions.forEach(q => questions.set(q.id, q));
}

initSeedData();

app.get('/api/items', (_req, res) => {
  const allItems = Array.from(items.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(allItems);
});

app.get('/api/items/:id', (req, res) => {
  const item = items.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { title, description, imageUrl, condition, ownerId, ownerName, ownerAvatar } = req.body;
  if (!title || !description || !ownerId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newItem: Item = {
    id: generateId(),
    title,
    description,
    imageUrl: imageUrl || '',
    condition: condition || '未标注',
    ownerId,
    ownerName: ownerName || '匿名用户',
    ownerAvatar: ownerAvatar || '',
    createdAt: new Date().toISOString(),
    exchangeRequests: [],
  };
  items.set(newItem.id, newItem);
  res.status(201).json(newItem);
});

app.put('/api/items/:id', (req, res) => {
  const item = items.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  const { title, description, imageUrl, condition } = req.body;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (imageUrl !== undefined) item.imageUrl = imageUrl;
  if (condition !== undefined) item.condition = condition;
  res.json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const deleted = items.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/items/:id/exchange', (req, res) => {
  const item = items.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  const { requesterId, requesterName, message } = req.body;
  if (!requesterId) {
    res.status(400).json({ error: 'Missing requesterId' });
    return;
  }
  const exchangeReq: ExchangeRequest = {
    id: generateId(),
    requesterId,
    requesterName: requesterName || '匿名用户',
    message: message || '我想交换这个物品',
    createdAt: new Date().toISOString(),
  };
  item.exchangeRequests.push(exchangeReq);
  res.status(201).json(exchangeReq);
});

app.get('/api/questions', (_req, res) => {
  const allQuestions = Array.from(questions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(allQuestions);
});

app.get('/api/questions/:id', (req, res) => {
  const question = questions.get(req.params.id);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  res.json(question);
});

app.post('/api/questions', (req, res) => {
  const { title, content, tags, authorId, authorName, authorAvatar } = req.body;
  if (!title || !content || !authorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newQuestion: Question = {
    id: generateId(),
    title,
    content,
    tags: tags || [],
    authorId,
    authorName: authorName || '匿名用户',
    authorAvatar: authorAvatar || '',
    answers: [],
    createdAt: new Date().toISOString(),
  };
  questions.set(newQuestion.id, newQuestion);
  res.status(201).json(newQuestion);
});

app.delete('/api/questions/:id', (req, res) => {
  const deleted = questions.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/questions/:id/answers', (req, res) => {
  const question = questions.get(req.params.id);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const { content, authorId, authorName, authorAvatar, parentId } = req.body;
  if (!content || !authorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newAnswer: Answer = {
    id: generateId(),
    content,
    authorId,
    authorName: authorName || '匿名用户',
    authorAvatar: authorAvatar || '',
    likes: 0,
    likedBy: new Set(),
    replies: [],
    createdAt: new Date().toISOString(),
  };
  if (parentId) {
    const findAndAddReply = (answers: Answer[]): boolean => {
      for (const ans of answers) {
        if (ans.id === parentId) {
          ans.replies.push(newAnswer);
          return true;
        }
        if (findAndAddReply(ans.replies)) return true;
      }
      return false;
    };
    findAndAddReply(question.answers);
  } else {
    question.answers.push(newAnswer);
  }
  res.status(201).json(newAnswer);
});

app.post('/api/questions/:questionId/answers/:answerId/like', (req, res) => {
  const question = questions.get(req.params.questionId);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }
  const findAnswer = (answers: Answer[]): Answer | null => {
    for (const ans of answers) {
      if (ans.id === req.params.answerId) return ans;
      const found = findAnswer(ans.replies);
      if (found) return found;
    }
    return null;
  };
  const answer = findAnswer(question.answers);
  if (!answer) {
    res.status(404).json({ error: 'Answer not found' });
    return;
  }
  if (answer.likedBy.has(userId)) {
    answer.likedBy.delete(userId);
    answer.likes = Math.max(0, answer.likes - 1);
  } else {
    answer.likedBy.add(userId);
    answer.likes += 1;
  }
  res.json({ likes: answer.likes, liked: answer.likedBy.has(userId) });
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
