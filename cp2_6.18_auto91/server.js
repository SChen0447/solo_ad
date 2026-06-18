import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let cards = [
  {
    id: uuidv4(),
    title: 'React Hooks 使用技巧',
    category: 'frontend',
    content: '## useEffect 依赖管理\n\n正确使用 useEffect 的依赖数组可以避免不必要的重渲染。\n\n```jsx\nuseEffect(() => {\n  fetchData();\n}, [id]); // 只在 id 变化时执行\n```',
    difficulty: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Express 中间件顺序',
    category: 'backend',
    content: '## 中间件执行顺序\n\n中间件的声明顺序非常重要，必须在路由之前声明：\n\n1. cors\n2. express.json()\n3. 路由处理',
    difficulty: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Git 撤销提交',
    category: 'tool',
    content: '## 常用撤销命令\n\n```bash\n# 撤销最后一次提交，保留修改\ngit reset --soft HEAD~1\n\n# 撤销最后一次提交，丢弃修改\ngit reset --hard HEAD~1\n```',
    difficulty: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'TypeScript 类型收窄失败',
    category: 'pitfall',
    content: '## 常见问题\n\n在回调函数中，TypeScript 无法正确收窄类型，需要先赋值给局部变量：\n\n```typescript\nconst value = maybeValue;\nif (value) {\n  callback(() => useValue(value));\n}\n```',
    difficulty: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let favorites = [];

app.get('/api/cards', (req, res) => {
  res.json(cards);
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

app.post('/api/cards', (req, res) => {
  const { title, category, content, difficulty } = req.body;
  if (!title || !category || !content || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const newCard = {
    id: uuidv4(),
    title,
    category,
    content,
    difficulty,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  cards.push(newCard);
  res.status(201).json(newCard);
});

app.put('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  cards[index] = {
    ...cards[index],
    ...req.body,
    id: cards[index].id,
    createdAt: cards[index].createdAt,
    updatedAt: new Date().toISOString()
  };
  res.json(cards[index]);
});

app.delete('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  cards.splice(index, 1);
  favorites = favorites.filter(f => f.cardId !== req.params.id);
  res.json({ success: true });
});

app.get('/api/favorites', (req, res) => {
  res.json(favorites);
});

app.post('/api/favorites', (req, res) => {
  const { cardId } = req.body;
  if (!cardId) {
    return res.status(400).json({ error: 'cardId is required' });
  }
  const exists = favorites.find(f => f.cardId === cardId);
  if (exists) {
    return res.status(409).json({ error: 'Already favorited' });
  }
  const newFavorite = {
    id: uuidv4(),
    cardId,
    createdAt: new Date().toISOString()
  };
  favorites.push(newFavorite);
  res.status(201).json(newFavorite);
});

app.delete('/api/favorites/:cardId', (req, res) => {
  const index = favorites.findIndex(f => f.cardId === req.params.cardId);
  if (index === -1) {
    return res.status(404).json({ error: 'Favorite not found' });
  }
  favorites.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
