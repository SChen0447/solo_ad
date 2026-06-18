import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface TopicOption {
  id: string;
  text: string;
  votes: number;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  avatarColor: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  options: TopicOption[];
  comments: Comment[];
  createdAt: string;
  votedUsers: string[];
}

const topics: Topic[] = [
  {
    id: uuidv4(),
    title: '团建方案选择',
    description: '请大家投票选择下个季度的团建活动方案，票数最高的方案将最终执行。',
    options: [
      { id: uuidv4(), text: '户外徒步登山', votes: 12 },
      { id: uuidv4(), text: '密室逃脱挑战', votes: 8 },
      { id: uuidv4(), text: '烧烤露营派对', votes: 15 },
    ],
    comments: [
      { id: uuidv4(), author: '勇敢的熊猫', content: '户外徒步不错，可以锻炼身体！', createdAt: new Date(Date.now() - 3600000).toISOString(), avatarColor: '#3b82f6' },
      { id: uuidv4(), author: '智慧的狐狸', content: '烧烤露营更有趣，大家觉得呢？', createdAt: new Date(Date.now() - 1800000).toISOString(), avatarColor: '#ef4444' },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    votedUsers: [],
  },
  {
    id: uuidv4(),
    title: '技术栈选型决策',
    description: '新项目的技术栈选型，请各位开发同学投票决定前端框架方向。',
    options: [
      { id: uuidv4(), text: 'React + TypeScript', votes: 20 },
      { id: uuidv4(), text: 'Vue 3 + TypeScript', votes: 14 },
      { id: uuidv4(), text: 'Svelte + TypeScript', votes: 6 },
    ],
    comments: [
      { id: uuidv4(), author: '灵动的猎豹', content: 'React生态更成熟，推荐选React', createdAt: new Date(Date.now() - 7200000).toISOString(), avatarColor: '#10b981' },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    votedUsers: [],
  },
  {
    id: uuidv4(),
    title: '年会节目方案',
    description: '年会即将到来，请投票选出你最期待的年会节目形式！',
    options: [
      { id: uuidv4(), text: '才艺表演秀', votes: 5 },
      { id: uuidv4(), text: '互动游戏竞赛', votes: 9 },
      { id: uuidv4(), text: '抽奖狂欢夜', votes: 18 },
    ],
    comments: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    votedUsers: [],
  },
];

app.get('/api/topics', (_req, res) => {
  const sorted = [...topics].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.get('/api/topics/:id', (req, res) => {
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json(topic);
});

app.post('/api/topics', (req, res) => {
  const { title, description, options } = req.body as {
    title: string;
    description: string;
    options: string[];
  };
  if (!title || !options || options.length === 0) {
    res.status(400).json({ error: 'Title and options are required' });
    return;
  }
  const newTopic: Topic = {
    id: uuidv4(),
    title,
    description: description || '',
    options: options.map((text) => ({ id: uuidv4(), text, votes: 0 })),
    comments: [],
    createdAt: new Date().toISOString(),
    votedUsers: [],
  };
  topics.push(newTopic);
  res.status(201).json(newTopic);
});

app.post('/api/topics/:id/vote', (req, res) => {
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  const { optionId, userId } = req.body as { optionId: string; userId: string };
  if (!optionId || !userId) {
    res.status(400).json({ error: 'optionId and userId are required' });
    return;
  }
  if (topic.votedUsers.includes(userId)) {
    res.status(403).json({ error: '你已经投过票了，每个话题只能投一次' });
    return;
  }
  const option = topic.options.find((o) => o.id === optionId);
  if (!option) {
    res.status(404).json({ error: 'Option not found' });
    return;
  }
  option.votes += 1;
  topic.votedUsers.push(userId);
  res.json(topic);
});

app.post('/api/topics/:id/comments', (req, res) => {
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  const { author, content, avatarColor } = req.body as {
    author: string;
    content: string;
    avatarColor: string;
  };
  if (!content || !author) {
    res.status(400).json({ error: 'Author and content are required' });
    return;
  }
  const comment: Comment = {
    id: uuidv4(),
    author,
    content,
    createdAt: new Date().toISOString(),
    avatarColor: avatarColor || '#3b82f6',
  };
  topic.comments.push(comment);
  res.status(201).json(comment);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
