import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

interface Vote {
  userId: string;
  optionId: string;
}

interface Comment {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  votes: Vote[];
  comments: Comment[];
  createdAt: number;
}

const topics: Topic[] = [];

function seedData() {
  const now = Date.now();
  const sampleTopics: Topic[] = [
    {
      id: uuidv4(),
      title: '团建地点选择',
      description: '本月团建活动地点投票，请大家积极参与！',
      options: [
        { id: uuidv4(), text: '郊外露营', votes: 8 },
        { id: uuidv4(), text: '密室逃脱', votes: 12 },
        { id: uuidv4(), text: '海边度假村', votes: 5 },
      ],
      votes: [],
      comments: [
        { id: uuidv4(), userId: 'u1', nickname: '勇敢的熊猫', text: '我觉得密室逃脱很有意思！', createdAt: now - 3600000 },
        { id: uuidv4(), userId: 'u2', nickname: '智慧的狐狸', text: '露营可以看星星~', createdAt: now - 1800000 },
      ],
      createdAt: now - 86400000,
    },
    {
      id: uuidv4(),
      title: '新项目技术栈选型',
      description: '新项目前端框架选择，欢迎讨论。',
      options: [
        { id: uuidv4(), text: 'React + TypeScript', votes: 15 },
        { id: uuidv4(), text: 'Vue 3 + TypeScript', votes: 10 },
        { id: uuidv4(), text: 'Angular', votes: 3 },
      ],
      votes: [],
      comments: [
        { id: uuidv4(), userId: 'u3', nickname: '快乐的海豚', text: 'React生态更好一些', createdAt: now - 7200000 },
      ],
      createdAt: now - 172800000,
    },
    {
      id: uuidv4(),
      title: '下午茶点心投票',
      description: '本周下午茶吃什么？',
      options: [
        { id: uuidv4(), text: '奶茶+蛋糕', votes: 20 },
        { id: uuidv4(), text: '咖啡+三明治', votes: 8 },
        { id: uuidv4(), text: '水果拼盘', votes: 6 },
        { id: uuidv4(), text: '寿司拼盘', votes: 11 },
      ],
      votes: [],
      comments: [],
      createdAt: now - 7200000,
    },
  ];
  topics.push(...sampleTopics);
}

seedData();

app.get('/api/topics', (_req: Request, res: Response) => {
  const result = topics
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      optionCount: t.options.length,
      totalVotes: t.options.reduce((sum, o) => sum + o.votes, 0),
      commentCount: t.comments.length,
      createdAt: t.createdAt,
    }));
  res.json(result);
});

app.get('/api/topics/:id', (req: Request, res: Response) => {
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0);
  const participants = new Set(topic.votes.map((v) => v.userId)).size;
  res.json({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    options: topic.options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
    })),
    totalVotes,
    participants,
    comments: topic.comments.slice(-10).reverse(),
    createdAt: topic.createdAt,
  });
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { title, description, options } = req.body;
  if (!title || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: '标题和至少2个选项是必需的' });
  }
  const topic: Topic = {
    id: uuidv4(),
    title,
    description: description || '',
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: 0,
    })),
    votes: [],
    comments: [],
    createdAt: Date.now(),
  };
  topics.unshift(topic);
  res.status(201).json(topic);
});

app.post('/api/topics/:id/vote', (req: Request, res: Response) => {
  const { userId, optionId } = req.body;
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const voted = topic.votes.find((v) => v.userId === userId);
  if (voted) {
    return res.status(400).json({ error: '您已经投过票了', alreadyVoted: true, optionId: voted.optionId });
  }
  const option = topic.options.find((o) => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }
  option.votes += 1;
  topic.votes.push({ userId, optionId });
  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0);
  res.json({
    success: true,
    options: topic.options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
    })),
    totalVotes,
    participants: new Set(topic.votes.map((v) => v.userId)).size,
  });
});

app.get('/api/topics/:id/vote-status', (req: Request, res: Response) => {
  const { userId } = req.query;
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const voted = topic.votes.find((v) => v.userId === userId);
  res.json({
    hasVoted: !!voted,
    optionId: voted?.optionId || null,
  });
});

app.post('/api/topics/:id/comments', (req: Request, res: Response) => {
  const { userId, nickname, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const topic = topics.find((t) => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const comment: Comment = {
    id: uuidv4(),
    userId: userId || uuidv4(),
    nickname: nickname || '匿名用户',
    text: text.trim(),
    createdAt: Date.now(),
  };
  topic.comments.push(comment);
  res.status(201).json({
    comment,
    commentCount: topic.comments.length,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
