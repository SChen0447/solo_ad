import express from 'express';
import { v4 as uuidv4 } from 'uuid';

interface TechOption {
  id: string;
  name: string;
  version: string;
  advantages: string[];
  disadvantages: string[];
  tags: string[];
  ratings: Record<string, number>;
  ratingNotes: Record<string, string>;
}

interface VoteRecord {
  optionId: string;
  vote: 'support' | 'oppose' | 'abstain';
}

interface Project {
  id: string;
  shortCode: string;
  name: string;
  description: string;
  options: TechOption[];
  votes: VoteRecord[];
  createdAt: string;
  createdBy: string;
}

const app = express();
const PORT = 3000;

app.use(express.json());

const projects: Project[] = [];

const DIMENSIONS = [
  { key: 'performance', label: '性能' },
  { key: 'learningCurve', label: '学习曲线' },
  { key: 'community', label: '社区活跃度' },
  { key: 'ecosystem', label: '生态系统' },
  { key: 'deployment', label: '部署难度' },
];

const generateShortCode = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/dimensions', (req, res) => {
  res.json(DIMENSIONS);
});

app.post('/projects', (req, res) => {
  try {
    const { name, description, options, createdBy } = req.body;

    if (!name || name.length > 20) {
      return res.status(400).json({ error: '项目名称不能为空且不超过20字' });
    }
    if (!description || description.length > 150) {
      return res.status(400).json({ error: '项目描述不能为空且不超过150字' });
    }

    const newOptions: TechOption[] = (options || []).map((opt: Omit<TechOption, 'id'>) => ({
      id: uuidv4(),
      name: opt.name || '',
      version: opt.version || '',
      advantages: opt.advantages || [],
      disadvantages: opt.disadvantages || [],
      tags: opt.tags || [],
      ratings: opt.ratings || {},
      ratingNotes: opt.ratingNotes || {},
    }));

    const project: Project = {
      id: uuidv4(),
      shortCode: generateShortCode(),
      name,
      description,
      options: newOptions,
      votes: [],
      createdAt: new Date().toISOString(),
      createdBy: createdBy || '匿名用户',
    };

    projects.push(project);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: '创建项目失败' });
  }
});

app.get('/projects/list', (req, res) => {
  const list = projects.map((p) => ({
    id: p.id,
    shortCode: p.shortCode,
    name: p.name,
    description: p.description,
    optionCount: p.options.length,
    voteCount: p.votes.length,
    createdAt: p.createdAt,
  }));
  res.json(list);
});

app.get('/projects/:id', (req, res) => {
  const project = projects.find(
    (p) => p.id === req.params.id || p.shortCode === req.params.id
  );
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  res.json(project);
});

app.put('/projects/:id', (req, res) => {
  const index = projects.findIndex(
    (p) => p.id === req.params.id || p.shortCode === req.params.id
  );
  if (index === -1) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const { name, description, options } = req.body;
  const project = projects[index];

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (options) {
    project.options = options.map((opt: TechOption) => ({
      ...opt,
      id: opt.id || uuidv4(),
    }));
  }

  res.json(project);
});

app.post('/projects/:id/votes', (req, res) => {
  const index = projects.findIndex(
    (p) => p.id === req.params.id || p.shortCode === req.params.id
  );
  if (index === -1) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const { optionId, vote } = req.body;
  if (!['support', 'oppose', 'abstain'].includes(vote)) {
    return res.status(400).json({ error: '无效的投票类型' });
  }

  const project = projects[index];
  const existingIndex = project.votes.findIndex((v) => v.optionId === optionId);

  if (existingIndex !== -1) {
    project.votes[existingIndex].vote = vote;
  } else {
    project.votes.push({ optionId, vote });
  }

  res.json({ votes: project.votes });
});

app.get('/projects/:id/share', (req, res) => {
  const project = projects.find(
    (p) => p.id === req.params.id || p.shortCode === req.params.id
  );
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  res.json({ shortCode: project.shortCode, shareUrl: `/share/${project.shortCode}` });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
