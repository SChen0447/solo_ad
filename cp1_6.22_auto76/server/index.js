import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const delay = (req, res, next) => {
  const delayTime = Math.floor(Math.random() * 101) + 100;
  setTimeout(next, delayTime);
};

app.use(delay);

const stories = new Map();

const seedStories = [
  {
    id: uuidv4(),
    title: '星际旅人',
    description: '一名孤独的宇航员在遥远星系中发现了一个神秘的信号，开始了一段改变命运的旅程。',
    chapters: [
      {
        id: uuidv4(),
        content: '2157年，我是"探索者号"的唯一船员。在距离地球42光年的地方，我的探测器捕捉到了一个规律的脉冲信号。它来自一颗被厚厚的冰层覆盖的卫星。当我驾驶着陆器穿过冰层时，眼前的景象让我屏住了呼吸——一座巨大的水晶城市在幽蓝的光芒中静静沉睡。',
        author: '张明远',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 7
      },
      {
        id: uuidv4(),
        content: '我小心翼翼地走进这座城市，街道上没有任何生命的迹象，但每一块水晶都在微微发光，仿佛在呼吸。城市中心有一座高耸的塔楼，顶端漂浮着一个巨大的球体。当我靠近时，球体表面开始浮现出我从未见过的符号，然后慢慢变成了中文："欢迎，继承者。"',
        author: '李思琪',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 5
      },
      {
        id: uuidv4(),
        content: '我还没来得及反应，一道柔和的光芒从球体中涌出，包裹住了我的全身。突然间，无数的画面涌入我的脑海——这个文明的兴衰，他们的知识和智慧，还有他们留给宇宙的最后遗产。原来，他们并没有消失，而是选择了另一种方式存在。而我，将成为他们与人类之间的桥梁。',
        author: '王浩然',
        status: 'pending',
        createdAt: Date.now() - 86400000 * 2
      }
    ],
    createdAt: Date.now() - 86400000 * 10
  },
  {
    id: uuidv4(),
    title: '时光书店',
    description: '一条老街上有一家神秘的书店，每一本书都能带你回到故事发生的那一刻。',
    chapters: [
      {
        id: uuidv4(),
        content: '雨幕中的梧桐街27号，是一家有着百年历史的旧书店。推开门，风铃发出清脆的声响，空气中弥漫着纸张和檀木的香气。店主是一位白发老人，他微笑着对我说："每一本书都有它的灵魂，翻开它，你就能亲眼见证那些故事。"',
        author: '陈雨萱',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 6
      },
      {
        id: uuidv4(),
        content: '我半信半疑地拿起一本泛黄的《宋词选集》，翻开第一页。就在我的视线接触到文字的瞬间，周围的景象开始扭曲变化。等我反应过来时，我已经站在一条繁华的宋朝街道上，耳边是叫卖声和马车驶过的声响，远处一座楼阁中传来悠扬的笛声。',
        author: '刘子墨',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 4
      }
    ],
    createdAt: Date.now() - 86400000 * 8
  },
  {
    id: uuidv4(),
    title: '深海来信',
    description: '一名海洋生物学家在马里亚纳海沟深处发现了来自未知文明的讯息。',
    chapters: [
      {
        id: uuidv4(),
        content: '"蛟龙号"下沉到了10909米的深度，这是人类探索过的最深处。就在我以为这里只有永恒的黑暗和寂静时，声呐屏幕上出现了规律的波形。那不是任何已知海洋生物的信号，而是一种结构化的信息——有人在这深渊之下向我们发送消息。',
        author: '赵海涛',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 5
      }
    ],
    createdAt: Date.now() - 86400000 * 6
  },
  {
    id: uuidv4(),
    title: '记忆当铺',
    description: '传说中有一家可以典当记忆的店铺，人们用珍贵的回忆换取想要的东西。',
    chapters: [
      {
        id: uuidv4(),
        content: '人生最艰难的时刻，我在一条小巷里找到了那家传说中的当铺。雕花的木门上挂着一块匾额，写着"记忆当铺"四个大字。店主是个眼神深邃的女人，她轻声说："你可以典当任何记忆——快乐的、悲伤的、遗憾的。典当之后，你将永远不再记得那段经历。"',
        author: '孙梦琪',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 4
      }
    ],
    createdAt: Date.now() - 86400000 * 5
  },
  {
    id: uuidv4(),
    title: '云端王国',
    description: '一个住在云端的神秘种族，他们从不踏足地面，直到一场风暴改变了一切。',
    chapters: [
      {
        id: uuidv4(),
        content: '我们是云族，世世代代居住在漂浮于万米高空的云岛上。我们的城市由凝结的云朵构成，我们的食物是雨露和阳光。族规严厉禁止任何人接触地面，传说那是一个被诅咒的世界。然而，那年的超级风暴，击碎了我们的云岛，也让我坠向了那个"被诅咒"的世界。',
        author: '周凌云',
        status: 'approved',
        createdAt: Date.now() - 86400000 * 3
      }
    ],
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: uuidv4(),
    title: '镜像之城',
    description: '镜子的另一端有一个和现实完全对称的世界，那里住着另一个你。',
    chapters: [
      {
        id: uuidv4(),
        content: '我从没想过镜子里的世界是真实存在的。那天深夜，我在浴室的镜子里看到了另一个自己——她的动作比我慢了半拍，脸上带着我从未有过的微笑。她轻声说："你终于发现了。要不要过来看看这边的世界？在这里，你所有的遗憾都可以弥补。"',
        author: '林镜心',
        status: 'pending',
        createdAt: Date.now() - 86400000 * 2
      }
    ],
    createdAt: Date.now() - 86400000 * 3
  }
];

seedStories.forEach(story => {
  stories.set(story.id, story);
});

app.get('/api/stories', (req, res) => {
  const storyList = Array.from(stories.values()).map(story => ({
    id: story.id,
    title: story.title,
    description: story.description,
    chapterCount: story.chapters.length
  }));
  res.json(storyList);
});

app.get('/api/stories/:id', (req, res) => {
  const story = stories.get(req.params.id);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  res.json(story);
});

app.post('/api/stories', (req, res) => {
  const { title, description, initialContent } = req.body;
  
  if (!title || !description || !initialContent) {
    return res.status(400).json({ error: '请填写完整的故事信息' });
  }

  const storyId = uuidv4();
  const chapterId = uuidv4();
  const now = Date.now();

  const newStory = {
    id: storyId,
    title,
    description,
    chapters: [
      {
        id: chapterId,
        content: initialContent,
        author: '匿名作者',
        status: 'approved',
        createdAt: now
      }
    ],
    createdAt: now
  };

  stories.set(storyId, newStory);
  res.status(201).json(newStory);
});

app.post('/api/stories/:id/chapters', (req, res) => {
  const story = stories.get(req.params.id);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }

  const { content, author } = req.body;
  
  if (!content || !author) {
    return res.status(400).json({ error: '请填写章节内容和作者姓名' });
  }

  const newChapter = {
    id: uuidv4(),
    content,
    author,
    status: 'pending',
    createdAt: Date.now()
  };

  story.chapters.push(newChapter);
  res.status(201).json(newChapter);
});

app.patch('/api/stories/:id/chapters/:chapterId', (req, res) => {
  const story = stories.get(req.params.id);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }

  const chapter = story.chapters.find(c => c.id === req.params.chapterId);
  if (!chapter) {
    return res.status(404).json({ error: '章节不存在' });
  }

  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }

  chapter.status = status;
  res.json(chapter);
});

app.listen(PORT, () => {
  console.log(`故事接龙服务器运行在 http://localhost:${PORT}`);
  console.log(`已预置 ${stories.size} 个示例故事`);
});
