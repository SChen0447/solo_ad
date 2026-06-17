import { v4 as uuidv4 } from 'uuid';
import type { Card, Link } from '../types';

const sampleTitles = [
  'React Hooks 深入理解',
  '前端性能优化技巧',
  '设计系统构建指南',
  'TypeScript 高级类型',
  'CSS Grid 布局实战',
  '用户体验设计原则',
  'Node.js 异步编程',
  '数据结构与算法',
  '微前端架构实践',
  '代码审查最佳实践',
  '响应式设计模式',
  'GraphQL API 设计',
  '前端测试策略',
  '可视化图表选型',
  '产品思维培养',
];

const sampleContents = [
  'useEffect 的依赖数组一定要精确，否则会导致不必要的重渲染或闭包陷阱。推荐使用 ESLint 的 exhaustive-deps 规则来辅助检查。',
  '使用 React.memo、useMemo 和 useCallback 可以有效减少不必要的渲染，但不要过度使用，因为浅比较本身也有性能开销。',
  '一个好的设计系统应该包含：设计 Token、组件库、设计规范文档和使用示例。一致性是设计系统的核心价值。',
  '条件类型、映射类型、模板字面量类型是 TypeScript 类型体操的三大利器，可以构建出非常灵活的类型定义。',
  'Grid 布局比 Flex 更适合二维布局场景，grid-template-areas 可以让布局结构一目了然。',
  '尼尔森十大可用性原则是 UX 设计的基础：可见性原则、匹配原则、用户控制与自由、一致性原则等。',
  'Promise、async/await、事件循环机制是理解 Node.js 异步编程的关键，宏任务和微任务的执行顺序需要特别注意。',
  '时间换空间还是空间换时间？不同场景下需要做出权衡，哈希表通常是空间换时间的典型代表。',
  'Module Federation 是目前微前端方案中最优雅的实现方式，运行时动态加载模块，独立部署互不影响。',
  '代码审查的目的是提升代码质量、知识共享和团队协作，而不是找 bug。审查者需要有建设性意见。',
  '移动优先还是桌面优先？取决于目标用户群体。媒体查询断点建议在 768px、1024px、1440px 处设置。',
  'GraphQL 的类型系统和按需查询能力极大地提升了前端开发效率，但需要注意 N+1 查询和缓存策略问题。',
  '单元测试覆盖核心逻辑，集成测试覆盖关键流程，E2E 测试覆盖用户主路径。测试金字塔需要合理分布。',
  'ECharts、D3.js、Chart.js 各有优劣。快速实现用 ECharts，高度定制化用 D3.js，简单图表用 Chart.js。',
  '产品思维的核心是：用户是谁、解决什么问题、商业价值是什么。技术是手段，用户价值才是目的。',
];

const sampleTags = [
  ['前端', 'React', 'Hooks'],
  ['前端', '性能优化', 'React'],
  ['设计', '设计系统', 'UI'],
  ['前端', 'TypeScript'],
  ['前端', 'CSS', '布局'],
  ['设计', 'UX', '用户体验'],
  ['后端', 'Node.js', '异步'],
  ['算法', '数据结构'],
  ['前端', '架构', '微前端'],
  ['工程化', '代码质量', '团队协作'],
  ['前端', 'CSS', '响应式'],
  ['后端', 'API', 'GraphQL'],
  ['测试', '前端', '质量保障'],
  ['可视化', '前端', '数据'],
  ['产品', '思维', '方法论'],
];

const sampleUrls = [
  'https://react.dev/learn/hooks',
  'https://developer.mozilla.org/zh-CN/docs/Web/Performance',
  'https://medium.com/design-systems',
  'https://www.typescriptlang.org/docs/',
  'https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout',
  'https://www.nngroup.com/articles/ten-usability-heuristics/',
  'https://nodejs.org/en/learn/asynchronous-work',
  'https://leetcode.cn/',
  'https://webpack.js.org/concepts/module-federation/',
  'https://google.github.io/eng-practices/review/',
  'https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_media_queries',
  'https://graphql.org/learn/',
  'https://testing-library.com/docs/',
  'https://echarts.apache.org/',
  'https://www.producthunt.com/',
];

export function generateMockCards(count: number = 15): Card[] {
  const cards: Card[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const idx = i % sampleTitles.length;
    const col = i % 5;
    const row = Math.floor(i / 5);
    cards.push({
      id: uuidv4(),
      title: sampleTitles[idx],
      content: sampleContents[idx],
      url: sampleUrls[idx],
      summary: sampleContents[idx].slice(0, 50) + '...',
      tags: sampleTags[idx],
      x: 80 + col * 320,
      y: 80 + row * 260,
      createdAt: now - Math.floor(Math.random() * 30) * oneDay,
      updatedAt: now - Math.floor(Math.random() * 7) * oneDay,
      isNew: false,
    });
  }
  return cards;
}

export function generateMockLinks(cards: Card[]): Link[] {
  const links: Link[] = [];
  const labels = ['相关', '拓展', '冲突', '引用', '灵感来源'];

  for (let i = 0; i < cards.length - 1; i++) {
    if (Math.random() > 0.6) continue;
    const j = i + 1;
    links.push({
      id: uuidv4(),
      sourceCardId: cards[i].id,
      targetCardId: cards[j].id,
      label: labels[Math.floor(Math.random() * labels.length)],
    });
  }

  if (cards.length >= 3) {
    links.push({
      id: uuidv4(),
      sourceCardId: cards[0].id,
      targetCardId: cards[2].id,
      label: '相关',
    });
  }

  return links;
}
