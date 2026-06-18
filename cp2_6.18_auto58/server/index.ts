import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface VoteOption {
  id: string;
  text: string;
  votes: string[];
}

interface Comment {
  id: string;
  userName: string;
  content: string;
  createdAt: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  comments: Comment[];
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const topics: Topic[] = [
  {
    id: uuidv4(),
    title: '团建活动方案选择',
    description: '请选择下次团建活动的形式，让大家玩得开心！',
    options: [
      { id: uuidv4(), text: '户外露营烧烤', votes: ['user1', 'user2', 'user3'] },
      { id: uuidv4(), text: '密室逃脱挑战', votes: ['user4', 'user5'] },
      { id: uuidv4(), text: '温泉度假村', votes: ['user6', 'user7', 'user8', 'user9'] }
    ],
    comments: [
      { id: uuidv4(), userName: '勇敢的熊猫', content: '我觉得露营不错，亲近大自然！', createdAt: Date.now() - 3600000 },
      { id: uuidv4(), userName: '智慧的狐狸', content: '温泉可以放松身心，强烈推荐~', createdAt: Date.now() - 1800000 }
    ],
    createdAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '新项目前端框架选型',
    description: '新项目需要选择前端框架，请各位开发同学投票决定。',
    options: [
      { id: uuidv4(), text: 'React + TypeScript', votes: ['dev1', 'dev2', 'dev3', 'dev4', 'dev5'] },
      { id: uuidv4(), text: 'Vue 3 + TypeScript', votes: ['dev6', 'dev7'] },
      { id: uuidv4(), text: 'Angular', votes: ['dev8'] }
    ],
    comments: [
      { id: uuidv4(), userName: '敏捷的猎豹', content: 'React生态更成熟，组件库多。', createdAt: Date.now() - 7200000 },
      { id: uuidv4(), userName: '沉稳的大象', content: 'Vue上手快，团队学习成本低。', createdAt: Date.now() - 5400000 },
      { id: uuidv4(), userName: '好奇的松鼠', content: '两种都用过，各有千秋。', createdAt: Date.now() - 3600000 }
    ],
    createdAt: Date.now() - 172800000
  },
  {
    id: uuidv4(),
    title: '每周例会时间调整',
    description: '由于项目节奏变化，需要重新确定每周例会的时间。',
    options: [
      { id: uuidv4(), text: '周一上午 10:00', votes: ['p1', 'p2', 'p3'] },
      { id: uuidv4(), text: '周三下午 14:00', votes: ['p4', 'p5', 'p6', 'p7'] },
      { id: uuidv4(), text: '周五上午 9:00', votes: ['p8'] }
    ],
    comments: [
      { id: uuidv4(), userName: '快乐的海豚', content: '周三下午好，周末前总结也不错！', createdAt: Date.now() - 120000 }
    ],
    createdAt: Date.now() - 3600000
  }
];

app.get('/api/topics', (req: Request, res: Response) => {
  const sorted = [...topics].sort((a, b) => b.createdAt - a.createdAt);
  const result = sorted.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    optionCount: t.options.length,
    totalVotes: t.options.reduce((sum, o) => sum + o.votes.length, 0),
    commentsCount: t.comments.length,
    createdAt: t.createdAt,
    participantCount: new Set(t.options.flatMap(o => o.votes)).size
  }));
  res.json(result);
});

app.get('/api/topics/:id', (req: Request, res: Response) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const result = {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    options: topic.options.map(o => ({
      id: o.id,
      text: o.text,
      voteCount: o.votes.length
    })),
    totalVotes: topic.options.reduce((sum, o) => sum + o.votes.length, 0),
    comments: topic.comments.slice(-10).reverse(),
    createdAt: topic.createdAt,
    participantCount: new Set(topic.options.flatMap(o => o.votes)).size
  };
  res.json(result);
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { title, description, options } = req.body;
  if (!title || !options || options.length < 2) {
    return res.status(400).json({ error: '话题标题和至少2个选项是必需的' });
  }
  const newTopic: Topic = {
    id: uuidv4(),
    title,
    description: description || '',
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: []
    })),
    comments: [],
    createdAt: Date.now()
  };
  topics.unshift(newTopic);
  res.status(201).json(newTopic);
});

app.post('/api/topics/:id/vote', (req: Request, res: Response) => {
  const { optionId, userId } = req.body;
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const allVoters = topic.options.flatMap(o => o.votes);
  if (allVoters.includes(userId)) {
    return res.status(400).json({ error: '您已经投过票了' });
  }
  const option = topic.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }
  option.votes.push(userId);
  const result = {
    id: topic.id,
    options: topic.options.map(o => ({
      id: o.id,
      text: o.text,
      voteCount: o.votes.length
    })),
    totalVotes: topic.options.reduce((sum, o) => sum + o.votes.length, 0),
    participantCount: new Set(topic.options.flatMap(o => o.votes)).size
  };
  res.json(result);
});

app.get('/api/topics/:id/voted/:userId', (req: Request, res: Response) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  const { userId } = req.params;
  const votedOption = topic.options.find(o => o.votes.includes(userId));
  res.json({
    voted: !!votedOption,
    votedOptionId: votedOption?.id || null
  });
});

app.post('/api/topics/:id/comments', (req: Request, res: Response) => {
  const { userName, content } = req.body;
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const newComment: Comment = {
    id: uuidv4(),
    userName: userName || '匿名用户',
    content: content.trim(),
    createdAt: Date.now()
  };
  topic.comments.push(newComment);
  res.status(201).json({
    comment: newComment,
    commentsCount: topic.comments.length
  });
});

app.listen(PORT, () => {
  console.log(`投票看板后端服务器运行在 http://localhost:${PORT}`);
});
