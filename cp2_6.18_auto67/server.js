import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ========== 知识卡片模块 ==========
let cards = [
  {
    id: uuidv4(),
    title: 'React Hooks 使用技巧',
    category: '前端',
    content: '# React Hooks 技巧\n\n- useState 初始值可以传函数进行惰性初始化\n- useCallback 和 useMemo 用于性能优化\n- useEffect 的依赖数组要完整列出所有依赖项\n- useRef 可以用来存储不需要触发渲染的值',
    difficulty: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Express 中间件原理',
    category: '后端',
    content: '# Express 中间件\n\n中间件是 Express 的核心概念：\n\n1. **执行顺序**：按注册顺序依次执行\n2. **next()**：调用 next() 传递给下一个中间件\n3. **错误处理**：四个参数的中间件用于错误处理 (err, req, res, next)',
    difficulty: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'VS Code 高效快捷键',
    category: '工具',
    content: '# VS Code 快捷键\n\n## 常用快捷键\n\n- `Ctrl + P`：快速打开文件\n- `Ctrl + Shift + P`：命令面板\n- `Alt + 上/下`：移动当前行\n- `Ctrl + D`：选中下一个相同单词\n- `Ctrl + Shift + L`：选中所有相同单词',
    difficulty: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'CSS Flexbox 布局踩坑',
    category: '踩坑',
    content: '# Flexbox 踩坑记录\n\n## 问题：flex 子元素超出父容器\n\n**原因**：flex 子元素默认 `min-width: auto`，内容过长时会撑开父容器。\n\n**解决**：\n```css\n.child {\n  min-width: 0;\n  overflow: hidden;\n}\n```',
    difficulty: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'TypeScript 泛型入门',
    category: '前端',
    content: '# TypeScript 泛型\n\n泛型是 TypeScript 中最强大的特性之一。\n\n## 基本用法\n\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n```\n\n## 泛型约束\n\n```typescript\ninterface Lengthwise {\n  length: number;\n}\n\nfunction logLength<T extends Lengthwise>(arg: T): number {\n  return arg.length;\n}\n```',
    difficulty: 4,
    createdAt: new Date().toISOString()
  }
];

// ========== 收藏模块 ==========
let favorites = [];

// ========== 卡片 API ==========
app.get('/api/cards', (req, res) => {
  const { category, search } = req.query;
  let filteredCards = [...cards];

  if (category && category !== 'all') {
    filteredCards = filteredCards.filter(card => card.category === category);
  }

  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    filteredCards = filteredCards.filter(
      card =>
        card.title.toLowerCase().includes(keyword) ||
        card.content.toLowerCase().includes(keyword)
    );
  }

  res.json(filteredCards);
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  res.json(card);
});

app.post('/api/cards', (req, res) => {
  const { title, category, content, difficulty } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ error: '标题、分类和内容为必填项' });
  }

  const newCard = {
    id: uuidv4(),
    title,
    category,
    content,
    difficulty: difficulty || 1,
    createdAt: new Date().toISOString()
  };

  cards.unshift(newCard);
  res.status(201).json(newCard);
});

app.put('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }

  const { title, category, content, difficulty } = req.body;
  cards[index] = {
    ...cards[index],
    title: title || cards[index].title,
    category: category || cards[index].category,
    content: content !== undefined ? content : cards[index].content,
    difficulty: difficulty !== undefined ? difficulty : cards[index].difficulty
  };

  res.json(cards[index]);
});

app.delete('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }

  const deletedCard = cards.splice(index, 1)[0];

  // 同时从收藏中移除
  favorites = favorites.filter(id => id !== deletedCard.id);

  res.json({ message: '删除成功' });
});

app.get('/api/cards/:id/related', (req, res) => {
  const card = cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }

  const related = cards
    .filter(c => c.category === card.category && c.id !== card.id)
    .slice(0, 5);

  res.json(related);
});

// ========== 收藏 API ==========
app.get('/api/favorites', (req, res) => {
  const favoriteCards = cards.filter(card => favorites.includes(card.id));
  res.json(favoriteCards);
});

app.post('/api/favorites/:cardId', (req, res) => {
  const { cardId } = req.params;
  const card = cards.find(c => c.id === cardId);

  if (!card) {
    return res.status(404).json({ error: '卡片不存在' });
  }

  if (!favorites.includes(cardId)) {
    favorites.push(cardId);
  }

  res.json({ message: '收藏成功', card });
});

app.delete('/api/favorites/:cardId', (req, res) => {
  const { cardId } = req.params;
  favorites = favorites.filter(id => id !== cardId);
  res.json({ message: '取消收藏成功' });
});

app.get('/api/favorites/check/:cardId', (req, res) => {
  const { cardId } = req.params;
  res.json({ isFavorite: favorites.includes(cardId) });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
