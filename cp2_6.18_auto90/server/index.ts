import express from 'express';
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

interface Comment {
  id: string;
  content: string;
  nickname: string;
  timestamp: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  comments: Comment[];
  voters: string[];
  createdAt: number;
}

const topics: Topic[] = [
  {
    id: uuidv4(),
    title: '团建活动方案选择',
    description: '下个月团建活动，请大家投票选择最喜欢的方案！',
    options: [
      { id: uuidv4(), text: '户外烧烤露营', votes: 12 },
      { id: uuidv4(), text: '密室逃脱+聚餐', votes: 8 },
      { id: uuidv4(), text: '卡丁车竞速', votes: 15 },
    ],
    comments: [
      { id: uuidv4(), content: '卡丁车听起来很刺激！', nickname: '活泼的兔子', timestamp: Date.now() - 3600000 },
      { id: uuidv4(), content: '露营可以看星星，好浪漫~', nickname: '温柔的猫咪', timestamp: Date.now() - 1800000 },
    ],
    voters: [],
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    title: '前端技术栈升级决策',
    description: '团队计划升级前端技术栈，请投票选择最适合的方案。',
    options: [
      { id: uuidv4(), text: 'React 18 + TypeScript', votes: 20 },
      { id: uuidv4(), text: 'Vue 3 + TypeScript', votes: 18 },
      { id: uuidv4(), text: '保持现有技术栈', votes: 5 },
    ],
    comments: [
      { id: uuidv4(), content: 'React生态更成熟一些', nickname: '睿智的猫头鹰', timestamp: Date.now() - 7200000 },
    ],
    voters: [],
    createdAt: Date.now() - 172800000,
  },
  {
    id: uuidv4(),
    title: '下午茶时间投票',
    description: '公司新增下午茶福利，大家希望安排在什么时间？',
    options: [
      { id: uuidv4(), text: '上午10:00', votes: 6 },
      { id: uuidv4(), text: '下午15:00', votes: 25 },
      { id: uuidv4(), text: '下午16:30', votes: 10 },
    ],
    comments: [],
    voters: [],
    createdAt: Date.now() - 3600000,
  },
];

app.get('/api/topics', (_req, res) => {
  const sorted = [...topics].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    optionsCount: t.options.length,
    totalVotes: t.options.reduce((sum, o) => sum + o.votes, 0),
    commentsCount: t.comments.length,
    createdAt: t.createdAt,
  })));
});

app.get('/api/topics/:id', (req, res) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  res.json(topic);
});

app.post('/api/topics', (req, res) => {
  const { title, description, options } = req.body;
  if (!title || !description || !options || options.length < 2) {
    return res.status(400).json({ error: '请提供完整的话题信息（标题、描述、至少2个选项）' });
  }
  const newTopic: Topic = {
    id: uuidv4(),
    title,
    description,
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: 0,
    })),
    comments: [],
    voters: [],
    createdAt: Date.now(),
  };
  topics.unshift(newTopic);
  res.status(201).json(newTopic);
});

app.post('/api/topics/:id/vote', (req, res) => {
  const { optionId, nickname } = req.body;
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  if (topic.voters.includes(nickname)) {
    return res.status(400).json({ error: '您已经投过票了' });
  }
  const option = topic.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }
  option.votes += 1;
  topic.voters.push(nickname);
  res.json(topic);
});

app.post('/api/topics/:id/comments', (req, res) => {
  const { content, nickname } = req.body;
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const newComment: Comment = {
    id: uuidv4(),
    content: content.trim(),
    nickname,
    timestamp: Date.now(),
  };
  topic.comments.push(newComment);
  res.status(201).json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
