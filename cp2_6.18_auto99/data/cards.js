import { v4 as uuidv4 } from 'uuid';

let cards = [
  {
    id: uuidv4(),
    title: 'React Hooks 使用技巧',
    category: '前端',
    content: '## React Hooks 最佳实践\n\n1. **useState** 用于简单状态管理\n2. **useEffect** 处理副作用，注意依赖数组\n3. **useCallback** 和 **useMemo** 优化性能\n4. 自定义 Hook 提取复用逻辑',
    difficulty: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Express 中间件原理',
    category: '后端',
    content: '## Express 中间件\n\n中间件是 Express 的核心概念：\n\n- 应用级中间件：`app.use()`\n- 路由级中间件：`router.use()`\n- 错误处理中间件：四个参数 `(err, req, res, next)`\n- 内置中间件：`express.static`, `express.json`',
    difficulty: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Git 常用命令',
    category: '工具',
    content: '## Git 常用命令速查\n\n```bash\n# 初始化仓库\ngit init\n\n# 查看状态\ngit status\n\n# 提交代码\ngit add .\ngit commit -m "message"\n\n# 分支操作\ngit branch\ngit checkout -b feature\n```',
    difficulty: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: '跨域问题解决',
    category: '踩坑',
    content: '## 前端跨域问题\n\n### 问题\n浏览器同源策略阻止跨域请求\n\n### 解决方案\n\n1. **CORS**：后端设置 `Access-Control-Allow-Origin`\n2. **代理**：开发环境使用 webpack/vite 代理\n3. **JSONP**：仅支持 GET 请求\n4. **Nginx 反向代理**',
    difficulty: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'TypeScript 泛型',
    category: '前端',
    content: '## TypeScript 泛型\n\n泛型可以创建可重用的组件：\n\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\n// 接口中使用泛型\ninterface Container<T> {\n  value: T;\n  getValue(): T;\n}\n```',
    difficulty: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'VS Code 快捷键',
    category: '工具',
    content: '## VS Code 高效快捷键\n\n- `Ctrl + P`：快速打开文件\n- `Ctrl + Shift + P`：命令面板\n- `Alt + 上/下`：移动行\n- `Shift + Alt + 下`：复制行\n- `Ctrl + D`：选中下一个相同单词\n- `Ctrl + /`：注释/取消注释',
    difficulty: 1,
    createdAt: new Date().toISOString()
  }
];

export const getAllCards = () => cards;

export const getCardById = (id) => cards.find(card => card.id === id);

export const createCard = (cardData) => {
  const newCard = {
    id: uuidv4(),
    ...cardData,
    createdAt: new Date().toISOString()
  };
  cards.push(newCard);
  return newCard;
};

export const updateCard = (id, cardData) => {
  const index = cards.findIndex(card => card.id === id);
  if (index === -1) return null;
  cards[index] = { ...cards[index], ...cardData };
  return cards[index];
};

export const deleteCard = (id) => {
  const index = cards.findIndex(card => card.id === id);
  if (index === -1) return false;
  cards.splice(index, 1);
  return true;
};

export const getCardsByCategory = (category) => {
  return cards.filter(card => card.category === category);
};

export const searchCards = (keyword) => {
  const lowerKeyword = keyword.toLowerCase();
  return cards.filter(card =>
    card.title.toLowerCase().includes(lowerKeyword) ||
    card.content.toLowerCase().includes(lowerKeyword)
  );
};
