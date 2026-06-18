import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let cards = [];

const mockComments = [
  { id: uuidv4(), content: '深有同感，希望能有所改善', createdAt: Date.now() - 180000 },
  { id: uuidv4(), content: '支持这个想法！', createdAt: Date.now() - 600000 },
];

for (let i = 0; i < 30; i++) {
  cards.push({
    id: uuidv4(),
    title: `心声主题 #${i + 1} - 关于工作效率与团队协作的思考`,
    content: `这是第 ${i + 1} 条心声的详细内容。作为团队的一员，我觉得我们在沟通效率方面还有提升空间。希望能够通过更多的面对面交流和定期的团队建设活动，来增进彼此的了解和信任。同时，也建议引入更现代化的项目管理工具来帮助我们更好地追踪进度和分配任务。`,
    votes: Math.floor(Math.random() * 50),
    comments: i < 5 ? [...mockComments] : [],
    createdAt: Date.now() - i * 3600000,
  });
}

app.get('/api/cards', (_req, res) => {
  res.json(cards);
});

app.post('/api/cards', (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  if (title.length > 40) {
    return res.status(400).json({ error: '标题不能超过40字' });
  }
  
  if (content.length > 500) {
    return res.status(400).json({ error: '内容不能超过500字' });
  }
  
  const newCard = {
    id: uuidv4(),
    title,
    content,
    votes: 0,
    comments: [],
    createdAt: Date.now(),
  };
  
  cards.unshift(newCard);
  res.status(201).json(newCard);
});

app.post('/api/cards/:id/vote', (req, res) => {
  const { id } = req.params;
  const card = cards.find(c => c.id === id);
  
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  
  card.votes += 1;
  res.json({ votes: card.votes });
});

app.post('/api/cards/:id/comments', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  const card = cards.find(c => c.id === id);
  
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  
  if (!content || content.length > 200) {
    return res.status(400).json({ error: '评论内容不能为空且不能超过200字' });
  }
  
  const newComment = {
    id: uuidv4(),
    content,
    createdAt: Date.now(),
  };
  
  card.comments.push(newComment);
  res.status(201).json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
