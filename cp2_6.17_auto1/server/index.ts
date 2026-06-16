import express, { Request, Response } from 'express';
import cors from 'cors';

interface Score {
  rating: number;
  description: string;
}

interface TechSolution {
  id: string;
  name: string;
  version: string;
  advantages: string[];
  disadvantages: string[];
  tags: string[];
  scores: { [dimension: string]: Score };
}

interface Vote {
  solutionId: string;
  voteType: 'support' | 'oppose' | 'abstain';
  voterId: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  shortCode: string;
  solutions: TechSolution[];
  votes: Vote[];
}

interface Store {
  projects: Project[];
  shortCodeMap: { [shortCode: string]: string };
}

const store: Store = {
  projects: [],
  shortCodeMap: {}
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateShortCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (store.shortCodeMap[code]);
  return code;
}

const defaultDimensions = ['性能', '学习曲线', '社区活跃度', '生态系统', '部署难度'];

function initScores(): { [dimension: string]: Score } {
  const scores: { [dimension: string]: Score } = {};
  defaultDimensions.forEach(dim => {
    scores[dim] = { rating: 3, description: '' };
  });
  return scores;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/api/projects', (req: Request, res: Response) => {
  const { name, description, createdBy, solutions } = req.body;

  if (!name || name.length > 20) {
    return res.status(400).json({ error: '项目名称不能为空且不能超过20字' });
  }
  if (!description || description.length > 150) {
    return res.status(400).json({ error: '项目描述不能为空且不能超过150字' });
  }
  if (!solutions || solutions.length < 2) {
    return res.status(400).json({ error: '至少需要添加2个技术方案' });
  }

  const projectId = generateId();
  const shortCode = generateShortCode();

  const projectSolutions: TechSolution[] = solutions.map((s: Omit<TechSolution, 'id'>) => ({
    ...s,
    id: generateId(),
    scores: s.scores || initScores()
  }));

  const project: Project = {
    id: projectId,
    name,
    description,
    createdAt: Date.now(),
    createdBy: createdBy || '匿名用户',
    shortCode,
    solutions: projectSolutions,
    votes: []
  };

  store.projects.push(project);
  store.shortCodeMap[shortCode] = projectId;

  res.json({ id: projectId, shortCode });
});

app.get('/api/projects/list', (_req: Request, res: Response) => {
  const projects = store.projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    createdBy: p.createdBy,
    shortCode: p.shortCode,
    solutionCount: p.solutions.length,
    voteCount: p.votes.length
  }));
  res.json(projects);
});

app.get('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const project = store.projects.find(p => p.id === id);

  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  res.json(project);
});

app.get('/api/share/:shortCode', (req: Request, res: Response) => {
  const { shortCode } = req.params;
  const projectId = store.shortCodeMap[shortCode];

  if (!projectId) {
    return res.status(404).json({ error: '无效的分享链接' });
  }

  const project = store.projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  res.json(project);
});

app.post('/api/projects/:id/votes', (req: Request, res: Response) => {
  const { id } = req.params;
  const { solutionId, voteType, voterId } = req.body;

  const project = store.projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const solution = project.solutions.find(s => s.id === solutionId);
  if (!solution) {
    return res.status(404).json({ error: '方案不存在' });
  }

  if (!['support', 'oppose', 'abstain'].includes(voteType)) {
    return res.status(400).json({ error: '无效的投票类型' });
  }

  const existingVoteIndex = project.votes.findIndex(
    v => v.voterId === voterId && v.solutionId === solutionId
  );

  if (existingVoteIndex >= 0) {
    project.votes[existingVoteIndex].voteType = voteType;
  } else {
    project.votes.push({ solutionId, voteType, voterId });
  }

  res.json({ success: true });
});

app.get('/api/projects/:id/votes', (req: Request, res: Response) => {
  const { id } = req.params;
  const project = store.projects.find(p => p.id === id);

  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const result: {
    [solutionId: string]: { support: number; oppose: number; abstain: number };
  } = {};

  project.solutions.forEach(s => {
    result[s.id] = { support: 0, oppose: 0, abstain: 0 };
  });

  project.votes.forEach(v => {
    if (result[v.solutionId]) {
      result[v.solutionId][v.voteType]++;
    }
  });

  res.json({
    projectId: id,
    totalVotes: project.votes.length,
    results: result
  });
});

app.post('/api/projects/:id/scores', (req: Request, res: Response) => {
  const { id } = req.params;
  const { solutionId, dimension, rating, description } = req.body;

  const project = store.projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const solution = project.solutions.find(s => s.id === solutionId);
  if (!solution) {
    return res.status(404).json({ error: '方案不存在' });
  }

  if (!defaultDimensions.includes(dimension)) {
    return res.status(400).json({ error: '无效的评分维度' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  solution.scores[dimension] = { rating, description: description || '' };
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
