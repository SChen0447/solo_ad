import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

export interface Rating {
  id: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  author: string;
  summary: string;
  content: string;
  createdAt: string;
  ratings: Rating[];
}

let proposals: Proposal[] = [
  {
    id: '1',
    title: 'React 18 新特性详解',
    author: '张三',
    summary: '深入探讨 React 18 带来的并发特性、自动批处理、Suspense 改进等核心新特性，以及如何在项目中实践应用这些新特性提升用户体验。',
    content: '# React 18 新特性详解\n\n## 并发特性\n\nReact 18 引入了并发渲染机制，使得 React 可以同时准备多个版本的 UI。\n\n## 自动批处理\n\n现在，更新将自动批处理，无论它们发生在哪里。\n\n## Suspense 改进\n\nSuspense 现在支持服务端渲染和流式传输。',
    createdAt: '2024-01-15T10:30:00Z',
    ratings: [
      { id: 'r1', score: 5, comment: '讲解非常清晰，干货满满！', createdAt: '2024-01-16T14:20:00Z' },
      { id: 'r2', score: 4, comment: '内容很实用，期待更多分享', createdAt: '2024-01-17T09:15:00Z' }
    ]
  },
  {
    id: '2',
    title: 'TypeScript 高级类型技巧',
    author: '李四',
    summary: '分享 TypeScript 中的高级类型系统，包括条件类型、映射类型、模板字面量类型等高级特性的实战应用。',
    content: '# TypeScript 高级类型技巧\n\n## 条件类型\n\n条件类型允许我们根据条件选择不同的类型。\n\n## 映射类型\n\n映射类型可以基于现有类型创建新类型。\n\n## 模板字面量类型\n\n模板字面量类型让我们可以操作字符串类型。',
    createdAt: '2024-01-14T14:00:00Z',
    ratings: [
      { id: 'r3', score: 5, comment: '类型体操大师！', createdAt: '2024-01-15T11:30:00Z' }
    ]
  },
  {
    id: '3',
    title: '微前端架构实践',
    author: '王五',
    summary: '介绍微前端架构的设计理念、实现方案和在大型项目中的落地经验，包括 Module Federation、qiankun 等方案对比。',
    content: '# 微前端架构实践\n\n## 什么是微前端\n\n微前端是一种架构风格，将独立交付的前端应用组合成更大的整体。\n\n## 实现方案\n\n1. Module Federation\n2. qiankun\n3. 自定义方案',
    createdAt: '2024-01-13T09:00:00Z',
    ratings: [
      { id: 'r4', score: 4, comment: '架构思路很清晰', createdAt: '2024-01-14T16:45:00Z' },
      { id: 'r5', score: 3, comment: '可以再深入一些', createdAt: '2024-01-15T08:20:00Z' },
      { id: 'r6', score: 4, comment: '期待代码示例', createdAt: '2024-01-16T10:10:00Z' }
    ]
  },
  {
    id: '4',
    title: 'Node.js 性能优化指南',
    author: '赵六',
    summary: '从 V8 引擎原理出发，深入讲解 Node.js 应用的性能瓶颈分析和优化策略。',
    content: '# Node.js 性能优化指南\n\n## V8 引擎原理\n\n了解 V8 的编译和优化机制。\n\n## 性能分析工具\n\n使用 clinic.js、0x 等工具进行性能分析。\n\n## 优化策略\n\n内存优化、CPU 优化、I/O 优化。',
    createdAt: '2024-01-12T16:30:00Z',
    ratings: []
  },
  {
    id: '5',
    title: 'Docker 容器化最佳实践',
    author: '孙七',
    summary: '分享 Docker 在团队开发中的最佳实践，包括镜像优化、多阶段构建、安全加固等实用技巧。',
    content: '# Docker 容器化最佳实践\n\n## 镜像优化\n\n使用多阶段构建减小镜像体积。\n\n## 安全加固\n\n遵循容器安全最佳实践。\n\n## 开发工作流\n\nDocker Compose 在开发中的应用。',
    createdAt: '2024-01-11T11:00:00Z',
    ratings: [
      { id: 'r7', score: 5, comment: '非常实用的指南', createdAt: '2024-01-12T13:00:00Z' },
      { id: 'r8', score: 5, comment: '学到了很多', createdAt: '2024-01-13T09:30:00Z' },
      { id: 'r9', score: 4, comment: '不错的总结', createdAt: '2024-01-14T15:20:00Z' }
    ]
  }
];

const calculateAverageScore = (ratings: Rating[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

app.get('/api/proposals', (_req, res) => {
  const result = proposals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => ({
      id: p.id,
      title: p.title,
      author: p.author,
      summary: p.summary.length > 100 ? p.summary.slice(0, 100) + '...' : p.summary,
      createdAt: formatDate(p.createdAt),
      averageScore: calculateAverageScore(p.ratings),
      ratingCount: p.ratings.length
    }));
  res.json(result);
});

app.get('/api/proposals/:id', (req, res) => {
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found' });
    return;
  }
  const ratings = [...proposal.ratings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => ({
      ...r,
      createdAt: formatDate(r.createdAt)
    }));
  res.json({
    ...proposal,
    createdAt: formatDate(proposal.createdAt),
    ratings,
    averageScore: calculateAverageScore(proposal.ratings),
    ratingCount: proposal.ratings.length
  });
});

app.post('/api/proposals', (req, res) => {
  const { title, author, summary, content } = req.body;
  if (!title || !author || !summary || !content) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newProposal: Proposal = {
    id: uuidv4(),
    title,
    author,
    summary,
    content,
    createdAt: new Date().toISOString(),
    ratings: []
  };
  proposals.unshift(newProposal);
  res.status(201).json({
    ...newProposal,
    createdAt: formatDate(newProposal.createdAt),
    ratings: [],
    averageScore: 0,
    ratingCount: 0
  });
});

app.post('/api/proposals/:id/ratings', (req, res) => {
  const { score, comment } = req.body;
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found' });
    return;
  }
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: 'Invalid score' });
    return;
  }
  const newRating: Rating = {
    id: uuidv4(),
    score,
    comment: comment || '',
    createdAt: new Date().toISOString()
  };
  proposal.ratings.push(newRating);
  const ratings = [...proposal.ratings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => ({
      ...r,
      createdAt: formatDate(r.createdAt)
    }));
  res.json({
    ...proposal,
    createdAt: formatDate(proposal.createdAt),
    ratings,
    averageScore: calculateAverageScore(proposal.ratings),
    ratingCount: proposal.ratings.length
  });
});

app.get('/api/proposals/:id/ratings', (req, res) => {
  const proposal = proposals.find(p => p.id === req.params.id);
  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found' });
    return;
  }
  const ratings = [...proposal.ratings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => ({
      ...r,
      createdAt: formatDate(r.createdAt)
    }));
  res.json({
    ratings,
    averageScore: calculateAverageScore(proposal.ratings),
    ratingCount: proposal.ratings.length
  });
});

app.get('/api/leaderboard', (_req, res) => {
  const result = proposals
    .map(p => ({
      id: p.id,
      title: p.title,
      author: p.author,
      averageScore: calculateAverageScore(p.ratings),
      ratingCount: p.ratings.length,
      ratings: p.ratings.map(r => r.score)
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
  res.json(result);
});

app.get('/api/statistics', (_req, res) => {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  proposals.forEach(p => {
    p.ratings.forEach(r => {
      distribution[r.score]++;
    });
  });
  res.json({ distribution });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
