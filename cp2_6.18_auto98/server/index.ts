import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8080;

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
  author: string;
  createdAt: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  comments: Comment[];
  createdAt: number;
  voters: string[];
}

const topics: Topic[] = [
  {
    id: uuidv4(),
    title: '团建方案选择',
    description: '请投票选择本次团建的活动方案，我们将根据投票结果安排活动。',
    options: [
      { id: '1', text: '户外烧烤派对', votes: 15 },
      { id: '2', text: '密室逃脱', votes: 23 },
      { id: '3', text: '真人CS', votes: 12 }
    ],
    comments: [
      { id: 'c1', content: '密室逃脱听起来很有意思！', author: '勇敢的熊猫', createdAt: Date.now() - 3600000 },
      { id: 'c2', content: '户外烧烤可以放松心情', author: '智慧的狐狸', createdAt: Date.now() - 1800000 }
    ],
    createdAt: Date.now() - 86400000,
    voters: ['user1', 'user2', 'user3']
  },
  {
    id: uuidv4(),
    title: '新项目技术栈选择',
    description: '新项目即将启动，请各位同事投票选择最合适的前端技术栈。',
    options: [
      { id: '1', text: 'React + TypeScript', votes: 28 },
      { id: '2', text: 'Vue 3 + TypeScript', votes: 19 },
      { id: '3', text: 'Angular', votes: 8 }
    ],
    comments: [
      { id: 'c1', content: 'React生态更成熟', author: '冷静的鲨鱼', createdAt: Date.now() - 7200000 }
    ],
    createdAt: Date.now() - 172800000,
    voters: ['user4', 'user5']
  },
  {
    id: uuidv4(),
    title: '年会节目类型投票',
    description: '公司年会即将到来，请投票选择你最想看到的节目类型。',
    options: [
      { id: '1', text: '歌曲表演', votes: 32 },
      { id: '2', text: '舞蹈表演', votes: 25 },
      { id: '3', text: '小品相声', votes: 41 },
      { id: '4', text: '游戏互动', votes: 36 }
    ],
    comments: [],
    createdAt: Date.now() - 259200000,
    voters: []
  }
];

app.get('/api/topics', (_req: Request, res: Response) => {
  const sortedTopics = [...topics].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sortedTopics);
});

app.get('/api/topics/:id', (req: Request, res: Response) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  res.json(topic);
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { title, description, options } = req.body;
  
  if (!title || !description || !options || options.length < 2) {
    return res.status(400).json({ error: 'Invalid topic data' });
  }

  const newTopic: Topic = {
    id: uuidv4(),
    title,
    description,
    options: options.map((text: string, index: number) => ({
      id: String(index + 1),
      text,
      votes: 0
    })),
    comments: [],
    createdAt: Date.now(),
    voters: []
  };

  topics.unshift(newTopic);
  res.status(201).json(newTopic);
});

app.post('/api/topics/:id/vote', (req: Request, res: Response) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const { optionId, userId } = req.body;
  
  if (!optionId || !userId) {
    return res.status(400).json({ error: 'Missing optionId or userId' });
  }

  if (topic.voters.includes(userId)) {
    return res.status(400).json({ error: 'User has already voted' });
  }

  const option = topic.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(404).json({ error: 'Option not found' });
  }

  option.votes += 1;
  topic.voters.push(userId);
  
  res.json({ success: true, topic });
});

app.post('/api/topics/:id/comments', (req: Request, res: Response) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const { content, author } = req.body;
  
  if (!content || !author) {
    return res.status(400).json({ error: 'Missing content or author' });
  }

  const newComment: Comment = {
    id: uuidv4(),
    content,
    author,
    createdAt: Date.now()
  };

  topic.comments.push(newComment);
  res.status(201).json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
