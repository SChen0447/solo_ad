import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

let cards = [
  {
    id: uuidv4(),
    title: 'React Hooks 使用技巧',
    category: '前端',
    content: '# React Hooks 最佳实践\n\n- useState 的初始值可以传入函数来延迟计算\n- useCallback 和 useMemo 的区别：前者缓存函数，后者缓存计算结果\n- useEffect 的依赖数组要谨慎处理，避免无限循环\n\n```js\nconst [count, setCount] = useState(0);\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);\n```',
    difficulty: 3,
    createdAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: 'Express 中间件原理',
    category: '后端',
    content: '# Express 中间件\n\n中间件是 Express 的核心概念，它是一个可以访问请求对象、响应对象和 next 函数的函数。\n\n## 中间件类型\n1. 应用级中间件\n2. 路由级中间件\n3. 错误处理中间件\n4. 内置中间件\n5. 第三方中间件',
    difficulty: 4,
    createdAt: Date.now() - 172800000
  },
  {
    id: uuidv4(),
    title: 'Git 常用命令备忘',
    category: '工具',
    content: '# Git 常用命令\n\n## 基础命令\n- `git init` - 初始化仓库\n- `git add .` - 添加所有文件到暂存区\n- `git commit -m "message"` - 提交\n\n## 分支操作\n- `git branch` - 查看分支\n- `git checkout -b feature` - 创建并切换分支\n- `git merge feature` - 合并分支',
    difficulty: 2,
    createdAt: Date.now() - 259200000
  },
  {
    id: uuidv4(),
    title: 'TypeScript 类型体操踩坑',
    category: '踩坑',
    content: '# TypeScript 类型体操踩坑记录\n\n## 问题：never 类型的奇怪行为\n\n当使用条件类型时，如果传入 never 会得到意想不到的结果。\n\n```ts\ntype Test<T> = T extends string ? true : false;\ntype Result = Test<never>; // never，不是 false\n```\n\n原因：never 是所有类型的子类型，条件类型对 never 会分布式求值，而 never 是联合类型的空集，所以返回 never。',
    difficulty: 5,
    createdAt: Date.now() - 345600000
  },
  {
    id: uuidv4(),
    title: 'CSS Grid 布局技巧',
    category: '前端',
    content: '# CSS Grid 布局\n\n## 基础用法\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 20px;\n}\n```\n\n## 实用技巧\n- 使用 `minmax()` 实现自适应列数\n- `grid-area` 命名区域布局更直观\n- `auto-fit` vs `auto-fill`：前者会拉伸填满，后者会留空',
    difficulty: 3,
    createdAt: Date.now() - 432000000
  },
  {
    id: uuidv4(),
    title: 'Node.js 内存泄漏排查',
    category: '后端',
    content: '# Node.js 内存泄漏排查\n\n## 常见原因\n1. 全局变量过多\n2. 事件监听器未移除\n3. 闭包引用大对象\n4. 定时器未清理\n\n## 排查工具\n- Chrome DevTools Memory 面板\n- heapdump + Chrome 分析\n- clinic.js 工具集',
    difficulty: 4,
    createdAt: Date.now() - 518400000
  },
  {
    id: uuidv4(),
    title: 'VS Code 高效插件',
    category: '工具',
    content: '# VS Code 高效插件推荐\n\n## 开发效率\n- **Auto Rename Tag** - 自动重命名标签\n- **ESLint** - 代码检查\n- **Prettier** - 代码格式化\n\n## 主题美化\n- **One Dark Pro** - 经典暗色主题\n- **Material Icon Theme** - 文件图标\n\n## 实用工具\n- **GitLens** - Git 增强\n- **REST Client** - HTTP 请求测试',
    difficulty: 1,
    createdAt: Date.now() - 604800000
  }
];

let favorites = [];

app.get('/api/cards', (req, res) => {
  const { category, keyword } = req.query;
  let filtered = [...cards];

  if (category && category !== 'all') {
    filtered = filtered.filter(card => card.category === category);
  }

  if (keyword) {
    const kw = String(keyword).toLowerCase();
    filtered = filtered.filter(
      card =>
        card.title.toLowerCase().includes(kw) ||
        card.content.toLowerCase().includes(kw)
    );
  }

  res.json(filtered);
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
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Title, category, and content are required' });
  }
  const newCard = {
    id: uuidv4(),
    title,
    category,
    content,
    difficulty: difficulty || 3,
    createdAt: Date.now()
  };
  cards.unshift(newCard);
  res.status(201).json(newCard);
});

app.put('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  const { title, category, content, difficulty } = req.body;
  cards[index] = {
    ...cards[index],
    title: title || cards[index].title,
    category: category || cards[index].category,
    content: content !== undefined ? content : cards[index].content,
    difficulty: difficulty || cards[index].difficulty
  };
  res.json(cards[index]);
});

app.delete('/api/cards/:id', (req, res) => {
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  cards.splice(index, 1);
  favorites = favorites.filter(id => id !== req.params.id);
  res.json({ message: 'Card deleted successfully' });
});

app.get('/api/favorites', (req, res) => {
  const favoriteCards = cards.filter(card => favorites.includes(card.id));
  res.json(favoriteCards);
});

app.post('/api/favorites/:cardId', (req, res) => {
  const { cardId } = req.params;
  const card = cards.find(c => c.id === cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  if (!favorites.includes(cardId)) {
    favorites.push(cardId);
  }
  res.json({ favorited: true });
});

app.delete('/api/favorites/:cardId', (req, res) => {
  const { cardId } = req.params;
  favorites = favorites.filter(id => id !== cardId);
  res.json({ favorited: false });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
