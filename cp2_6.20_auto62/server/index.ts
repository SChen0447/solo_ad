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
  createdAt: number;
}

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  exchangeRequests: ExchangeRequest[];
}

interface Reply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

interface Answer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  replies: Reply[];
}

interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: number;
  answers: Answer[];
}

const itemsMap = new Map<string, Item>();
const questionsMap = new Map<string, Question>();

const conditions = ['全新', '几乎全新', '轻微使用', '有使用痕迹', '破损'];
const mockItems: Item[] = [
  { id: 'item_001', title: '九成新婴儿推车', description: '宝宝大了用不上了，推车状态很好，轮子顺滑，可折叠方便携带。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=baby%20stroller%20on%20white%20background%2C%20product%20photo&image_size=square', condition: '几乎全新', ownerId: 'user_001', ownerName: '小明邻居', createdAt: Date.now() - 86400000 * 2, exchangeRequests: [] },
  { id: 'item_002', title: '闲置跑步机', description: '搬家后没地方放，跑步机功能完好，速度和坡度可调，带心率监测。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=treadmill%20fitness%20machine%20on%20white%20background%2C%20product%20photo&image_size=square', condition: '轻微使用', ownerId: 'user_002', ownerName: '王阿姨', createdAt: Date.now() - 86400000 * 3, exchangeRequests: [] },
  { id: 'item_003', title: '儿童绘本套装（20本）', description: '孩子上小学了，幼儿园时期的绘本可以分享给更小的朋友，全套20本，无破损。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=children%20picture%20books%20stack%2C%20colorful%20covers&image_size=square', condition: '轻微使用', ownerId: 'user_003', ownerName: '李妈妈', createdAt: Date.now() - 86400000, exchangeRequests: [] },
  { id: 'item_004', title: '小米空气净化器', description: '换新了旧的不用了，滤芯还能用两个月左右，净化效果不错。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=xiaomi%20air%20purifier%20white%20product%20photo&image_size=square', condition: '有使用痕迹', ownerId: 'user_001', ownerName: '小明邻居', createdAt: Date.now() - 86400000 * 5, exchangeRequests: [] },
  { id: 'item_005', title: '手工编织毛毯', description: '自己编织的毛毯，纯羊毛材质，冬天盖着特别暖和，尺寸1.5m×2m。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handmade%20knitted%20wool%20blanket%20cozy&image_size=square', condition: '全新', ownerId: 'user_004', ownerName: '赵奶奶', createdAt: Date.now() - 86400000 * 1, exchangeRequests: [] },
  { id: 'item_006', title: '瑜伽垫+瑜伽砖', description: '买了新的，旧的送给需要的朋友，厚度6mm，防滑性很好。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yoga%20mat%20and%20blocks%20purple%20fitness&image_size=square', condition: '轻微使用', ownerId: 'user_005', ownerName: '张小姐', createdAt: Date.now() - 86400000 * 4, exchangeRequests: [] },
  { id: 'item_007', title: '复古台灯', description: '实木底座+暖光灯泡，很有氛围感，适合放在床头或书房。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20wooden%20desk%20lamp%20warm%20light&image_size=square', condition: '几乎全新', ownerId: 'user_002', ownerName: '王阿姨', createdAt: Date.now() - 86400000 * 6, exchangeRequests: [] },
  { id: 'item_008', title: '不锈钢锅具三件套', description: '炒锅+汤锅+煎锅，不锈钢材质耐用好清洗，无涂层更健康。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=stainless%20steel%20cookware%20set%20kitchen&image_size=square', condition: '有使用痕迹', ownerId: 'user_006', ownerName: '陈大叔', createdAt: Date.now() - 86400000 * 7, exchangeRequests: [] },
  { id: 'item_009', title: '儿童自行车16寸', description: '孩子长高了骑不了了，自行车保养很好，带辅助轮可拆卸。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kids%20bicycle%2016%20inch%20colorful&image_size=square', condition: '轻微使用', ownerId: 'user_003', ownerName: '李妈妈', createdAt: Date.now() - 86400000 * 2, exchangeRequests: [] },
  { id: 'item_010', title: '全新蓝牙音箱', description: '公司年会中奖，自己有了音响所以想换点别的，全新未拆封。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bluetooth%20speaker%20portable%20black%20product&image_size=square', condition: '全新', ownerId: 'user_001', ownerName: '小明邻居', createdAt: Date.now() - 3600000 * 5, exchangeRequests: [] },
  { id: 'item_011', title: '多肉植物盆栽（5盆）', description: '阳台上多肉繁殖太多了，分出来5盆，带陶瓷花盆，很好养活。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=succulent%20plants%20in%20ceramic%20pots&image_size=square', condition: '全新', ownerId: 'user_007', ownerName: '周爷爷', createdAt: Date.now() - 86400000 * 8, exchangeRequests: [] },
  { id: 'item_012', title: '电热水壶', description: '搬家多出来的，1.7L容量，烧水很快，自动断电功能正常。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20kettle%20white%20kitchen%20appliance&image_size=square', condition: '几乎全新', ownerId: 'user_004', ownerName: '赵奶奶', createdAt: Date.now() - 86400000 * 9, exchangeRequests: [] },
  { id: 'item_013', title: '办公升降桌', description: '换了个大的升降桌，这个小的用不着了，桌面1m×0.6m，升降功能正常。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=standing%20desk%20office%20minimal&image_size=square', condition: '轻微使用', ownerId: 'user_005', ownerName: '张小姐', createdAt: Date.now() - 86400000 * 10, exchangeRequests: [] },
  { id: 'item_014', title: '围棋棋盘+棋子', description: '木质棋盘，云子棋子，保养很好，适合围棋爱好者。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=go%20board%20game%20wooden%20with%20stones&image_size=square', condition: '几乎全新', ownerId: 'user_006', ownerName: '陈大叔', createdAt: Date.now() - 86400000 * 3, exchangeRequests: [] },
  { id: 'item_015', title: '真皮沙发单人椅', description: '换了整体沙发，这个单人椅真皮材质很舒服，棕色，有轻微使用痕迹。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=leather%20armchair%20brown%20single%20sofa&image_size=square', condition: '有使用痕迹', ownerId: 'user_002', ownerName: '王阿姨', createdAt: Date.now() - 86400000 * 12, exchangeRequests: [] },
  { id: 'item_016', title: '收纳箱套装（3个）', description: '塑料收纳箱大中小三个，叠放设计省空间，搬家后不需要了。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=storage%20boxes%20plastic%20stackable%20set&image_size=square', condition: '几乎全新', ownerId: 'user_007', ownerName: '周爷爷', createdAt: Date.now() - 86400000 * 4, exchangeRequests: [] },
  { id: 'item_017', title: 'Kindle电子书阅读器', description: '买了iPad后Kindle用得少了，屏幕无划痕，带保护套。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kindle%20ereader%20black%20device&image_size=square', condition: '轻微使用', ownerId: 'user_001', ownerName: '小明邻居', createdAt: Date.now() - 86400000 * 1, exchangeRequests: [] },
  { id: 'item_018', title: '棉麻窗帘（2片）', description: '换风格了，旧窗帘棉麻材质，米白色，尺寸2m×2.5m，遮光性一般。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=linen%20curtain%20beige%20window%20treatment&image_size=square', condition: '有使用痕迹', ownerId: 'user_004', ownerName: '赵奶奶', createdAt: Date.now() - 86400000 * 14, exchangeRequests: [] },
];

const mockQuestions: Question[] = [
  {
    id: 'q_001', title: '小区门口新开的超市怎么样？', content: '听说小区门口新开了一家超市，有人去过吗？价格和品质如何？', tags: ['生活', '购物'],
    authorId: 'user_001', authorName: '小明邻居', createdAt: Date.now() - 86400000, answers: [
      { id: 'a_001', content: '我去过了，价格还行，蔬菜比较新鲜，就是种类还不太多，以后应该会丰富起来。', authorId: 'user_002', authorName: '王阿姨', createdAt: Date.now() - 72000000, likes: 5, likedBy: ['user_001', 'user_003', 'user_005', 'user_006', 'user_007'], replies: [
        { id: 'r_001', content: '谢谢分享！改天去看看。', authorId: 'user_001', authorName: '小明邻居', createdAt: Date.now() - 70000000 }
      ] },
      { id: 'a_002', content: '肉类比外面便宜一些，我上周买了排骨很划算。', authorId: 'user_003', authorName: '李妈妈', createdAt: Date.now() - 60000000, likes: 3, likedBy: ['user_002', 'user_004', 'user_006'], replies: [] }
    ]
  },
  {
    id: 'q_002', title: '有没有靠谱的水管维修师傅推荐？', content: '家里厨房水管漏水了，需要找个靠谱的维修师傅，大家有推荐吗？', tags: ['维修', '求助'],
    authorId: 'user_004', authorName: '赵奶奶', createdAt: Date.now() - 86400000 * 2, answers: [
      { id: 'a_003', content: '我上次找的老张师傅，手艺很好，电话138xxxx1234，你可以联系看看。', authorId: 'user_006', authorName: '陈大叔', createdAt: Date.now() - 86400000, likes: 8, likedBy: ['user_001', 'user_002', 'user_003', 'user_004', 'user_005', 'user_007', 'user_008', 'user_009'], replies: [] }
    ]
  },
  {
    id: 'q_003', title: '小区快递柜不够用怎么办？', content: '最近快递柜总是满的，经常要去很远的驿站取件，大家有什么建议？', tags: ['快递', '生活'],
    authorId: 'user_005', authorName: '张小姐', createdAt: Date.now() - 86400000 * 3, answers: [
      { id: 'a_004', content: '可以跟物业反映，我们楼下的快递柜确实需要增加了。', authorId: 'user_007', authorName: '周爷爷', createdAt: Date.now() - 86400000 * 2, likes: 6, likedBy: ['user_001', 'user_002', 'user_003', 'user_004', 'user_005', 'user_006'], replies: [
        { id: 'r_002', content: '我已经向物业反映了，说下个月会增加一组。', authorId: 'user_005', authorName: '张小姐', createdAt: Date.now() - 86400000 * 2 + 3600000 }
      ] }
    ]
  },
  {
    id: 'q_004', title: '社区活动室几点开放？', content: '想带孩子去社区活动室玩，不知道开放时间是什么时候？', tags: ['社区', '活动'],
    authorId: 'user_003', authorName: '李妈妈', createdAt: Date.now() - 86400000 * 4, answers: [
      { id: 'a_005', content: '工作日上午9点到晚上9点，周末上午8点到晚上10点，记得带门禁卡。', authorId: 'user_002', authorName: '王阿姨', createdAt: Date.now() - 86400000 * 3, likes: 4, likedBy: ['user_001', 'user_003', 'user_005', 'user_006'], replies: [] }
    ]
  },
  {
    id: 'q_005', title: '附近有没有好的宠物医院？', content: '我家猫最近不太精神，想找个靠谱的宠物医院看看，大家有推荐吗？', tags: ['宠物', '求助'],
    authorId: 'user_001', authorName: '小明邻居', createdAt: Date.now() - 86400000 * 5, answers: [
      { id: 'a_006', content: '南门那家爱宠动物医院不错，医生很负责，价格也公道。', authorId: 'user_005', authorName: '张小姐', createdAt: Date.now() - 86400000 * 4, likes: 7, likedBy: ['user_001', 'user_002', 'user_003', 'user_004', 'user_006', 'user_007', 'user_008'], replies: [] },
      { id: 'a_007', content: '东门新开了一家，设备比较新，我家狗去做过体检感觉不错。', authorId: 'user_006', authorName: '陈大叔', createdAt: Date.now() - 86400000 * 4 + 7200000, likes: 3, likedBy: ['user_001', 'user_005', 'user_007'], replies: [] }
    ]
  },
  {
    id: 'q_006', title: '谁家有多的花盆？想换一些', content: '阳台上想种点花草，需要几个大花盆，不知道谁家有多余的？', tags: ['园艺', '交换'],
    authorId: 'user_007', authorName: '周爷爷', createdAt: Date.now() - 86400000 * 6, answers: [
      { id: 'a_008', content: '我家有几个不用的塑料花盆，大的小的都有，改天给你送去。', authorId: 'user_004', authorName: '赵奶奶', createdAt: Date.now() - 86400000 * 5, likes: 2, likedBy: ['user_007', 'user_001'], replies: [] }
    ]
  },
];

mockItems.forEach(item => itemsMap.set(item.id, { ...item, exchangeRequests: [...item.exchangeRequests] }));
mockQuestions.forEach(q => questionsMap.set(q.id, {
  ...q,
  answers: q.answers.map(a => ({
    ...a,
    likedBy: [...a.likedBy],
    replies: a.replies.map(r => ({ ...r }))
  }))
}));

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============ Items API ============

app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const allItems = Array.from(itemsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * limit;
  const items = allItems.slice(start, start + limit);
  res.json({
    items,
    total: allItems.length,
    hasMore: start + limit < allItems.length,
  });
});

app.get('/api/items/:id', (req, res) => {
  const item = itemsMap.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { title, description, imageUrl, condition, ownerId, ownerName } = req.body;
  if (!title || !description || !ownerId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const item: Item = {
    id: generateId('item'),
    title,
    description,
    imageUrl: imageUrl || '',
    condition: condition || '轻微使用',
    ownerId,
    ownerName: ownerName || '匿名邻居',
    createdAt: Date.now(),
    exchangeRequests: [],
  };
  itemsMap.set(item.id, item);
  res.status(201).json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const deleted = itemsMap.delete(req.params.id);
  res.json({ success: deleted });
});

app.put('/api/items/:id', (req, res) => {
  const item = itemsMap.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  const updated = { ...item, ...req.body, id: item.id, exchangeRequests: item.exchangeRequests };
  itemsMap.set(item.id, updated);
  res.json(updated);
});

app.post('/api/items/:id/request', (req, res) => {
  const item = itemsMap.get(req.params.id);
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
    id: generateId('exreq'),
    requesterId,
    requesterName: requesterName || '匿名邻居',
    message: message || '',
    createdAt: Date.now(),
  };
  item.exchangeRequests.push(exchangeReq);
  itemsMap.set(item.id, item);
  res.status(201).json({ success: true, request: exchangeReq });
});

// ============ Questions API ============

app.get('/api/questions', (_req, res) => {
  const questions = Array.from(questionsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(questions);
});

app.post('/api/questions', (req, res) => {
  const { title, content, tags, authorId, authorName } = req.body;
  if (!title || !content || !authorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const question: Question = {
    id: generateId('q'),
    title,
    content,
    tags: tags || [],
    authorId,
    authorName: authorName || '匿名邻居',
    createdAt: Date.now(),
    answers: [],
  };
  questionsMap.set(question.id, question);
  res.status(201).json(question);
});

app.delete('/api/questions/:id', (req, res) => {
  const deleted = questionsMap.delete(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/questions/:id/answers', (req, res) => {
  const question = questionsMap.get(req.params.id);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const { content, authorId, authorName } = req.body;
  if (!content || !authorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const answer: Answer = {
    id: generateId('a'),
    content,
    authorId,
    authorName: authorName || '匿名邻居',
    createdAt: Date.now(),
    likes: 0,
    likedBy: [],
    replies: [],
  };
  question.answers.push(answer);
  questionsMap.set(question.id, question);
  res.status(201).json(answer);
});

app.post('/api/questions/:qid/answers/:aid/like', (req, res) => {
  const question = questionsMap.get(req.params.qid);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const answer = question.answers.find(a => a.id === req.params.aid);
  if (!answer) {
    res.status(404).json({ error: 'Answer not found' });
    return;
  }
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }
  const idx = answer.likedBy.indexOf(userId);
  let liked: boolean;
  if (idx >= 0) {
    answer.likedBy.splice(idx, 1);
    answer.likes--;
    liked = false;
  } else {
    answer.likedBy.push(userId);
    answer.likes++;
    liked = true;
  }
  questionsMap.set(question.id, question);
  res.json({ liked, likes: answer.likes });
});

app.post('/api/questions/:qid/answers/:aid/replies', (req, res) => {
  const question = questionsMap.get(req.params.qid);
  if (!question) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const answer = question.answers.find(a => a.id === req.params.aid);
  if (!answer) {
    res.status(404).json({ error: 'Answer not found' });
    return;
  }
  const { content, authorId, authorName } = req.body;
  if (!content || !authorId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const reply: Reply = {
    id: generateId('r'),
    content,
    authorId,
    authorName: authorName || '匿名邻居',
    createdAt: Date.now(),
  };
  answer.replies.push(reply);
  questionsMap.set(question.id, question);
  res.status(201).json(reply);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
