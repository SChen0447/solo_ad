import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TeamMember {
  id: string;
  name: string;
  avatarColor: string;
  capacity: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  storyPoints: number;
  sprintId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalStoryPoints: number;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface Workload {
  memberId: string;
  memberName: string;
  avatarColor: string;
  assignedCount: number;
  remainingPoints: number;
  capacity: number;
}

const AVATAR_COLORS = [
  '#4299e1', '#48bb78', '#ed8936', '#e53e3e',
  '#9f7aea', '#ed64a6', '#38b2ac', '#ecc94b',
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'm1', name: '张伟', avatarColor: AVATAR_COLORS[0], capacity: 40 },
  { id: 'm2', name: '李娜', avatarColor: AVATAR_COLORS[1], capacity: 35 },
  { id: 'm3', name: '王强', avatarColor: AVATAR_COLORS[2], capacity: 30 },
  { id: 'm4', name: '刘芳', avatarColor: AVATAR_COLORS[3], capacity: 38 },
  { id: 'm5', name: '陈明', avatarColor: AVATAR_COLORS[4], capacity: 42 },
  { id: 'm6', name: '赵雪', avatarColor: AVATAR_COLORS[5], capacity: 36 },
];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const now = new Date();
const sprintStart = new Date(now);
sprintStart.setDate(now.getDate() - 4);
const sprintEnd = new Date(now);
sprintEnd.setDate(now.getDate() + 9);

const SAMPLE_SPRINT: Sprint = {
  id: 'sprint-001',
  name: 'Sprint 01 - 核心功能开发',
  startDate: formatDate(sprintStart),
  endDate: formatDate(sprintEnd),
  totalStoryPoints: 88,
};

let tasks: Task[] = [
  {
    id: uuidv4(),
    title: '用户登录模块开发',
    description: '实现基于JWT的用户登录和注册功能，包含表单验证和错误提示。',
    assigneeId: 'm1',
    priority: 'high',
    status: 'done',
    storyPoints: 8,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(sprintStart.getTime() + 86400000).toISOString(),
    updatedAt: new Date(sprintStart.getTime() + 2 * 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '数据库架构设计',
    description: '设计用户、任务、迭代等核心表结构，编写迁移脚本。',
    assigneeId: 'm3',
    priority: 'high',
    status: 'done',
    storyPoints: 5,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(sprintStart.getTime() + 86400000).toISOString(),
    updatedAt: new Date(sprintStart.getTime() + 3 * 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '任务看板UI组件',
    description: '实现拖拽式看板三列布局、任务卡片组件、状态切换动画。',
    assigneeId: 'm2',
    priority: 'high',
    status: 'in_progress',
    storyPoints: 13,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(sprintStart.getTime() + 2 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '冲刺燃尽图数据接口',
    description: '编写后端统计接口，按日期聚合已完成故事点，生成燃尽数据。',
    assigneeId: 'm4',
    priority: 'medium',
    status: 'in_progress',
    storyPoints: 5,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(sprintStart.getTime() + 3 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 43200000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '团队成员负荷视图',
    description: '实现成员工作量水平条形图，按负荷比例渐变着色。',
    assigneeId: 'm6',
    priority: 'medium',
    status: 'todo',
    storyPoints: 8,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '新建任务模态框',
    description: '实现任务创建表单，包含标题、描述、负责人、优先级字段。',
    assigneeId: 'm5',
    priority: 'medium',
    status: 'todo',
    storyPoints: 5,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 43200000).toISOString(),
    updatedAt: new Date(now.getTime() - 43200000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '响应式布局适配',
    description: '在小于1200px屏幕宽度下，将三列看板改为垂直堆叠布局。',
    assigneeId: 'm2',
    priority: 'low',
    status: 'todo',
    storyPoints: 3,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 21600000).toISOString(),
    updatedAt: new Date(now.getTime() - 21600000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '任务详情侧边栏',
    description: '点击卡片从右侧滑入详情面板，支持编辑描述与负责人。',
    assigneeId: null,
    priority: 'medium',
    status: 'todo',
    storyPoints: 8,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 10800000).toISOString(),
    updatedAt: new Date(now.getTime() - 10800000).toISOString(),
  },
  {
    id: uuidv4(),
    title: 'API错误处理与日志',
    description: '统一错误响应格式，添加请求日志中间件。',
    assigneeId: 'm4',
    priority: 'low',
    status: 'todo',
    storyPoints: 3,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 3600000).toISOString(),
    updatedAt: new Date(now.getTime() - 3600000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '单元测试基础框架',
    description: '搭建Jest测试环境，编写核心业务逻辑的单元测试。',
    assigneeId: 'm3',
    priority: 'low',
    status: 'todo',
    storyPoints: 5,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date(now.getTime() - 1800000).toISOString(),
    updatedAt: new Date(now.getTime() - 1800000).toISOString(),
  },
];

function generateBurndownData(): BurndownPoint[] {
  const start = new Date(SAMPLE_SPRINT.startDate);
  const end = new Date(SAMPLE_SPRINT.endDate);
  const days = getDaysBetween(start, end);
  const total = SAMPLE_SPRINT.totalStoryPoints;

  const result: BurndownPoint[] = [];
  const step = total / (days.length - 1 || 1);
  const today = new Date(formatDate(now));

  for (let i = 0; i < days.length; i++) {
    const date = formatDate(days[i]);
    const ideal = Math.max(0, total - step * i);
    let actual = total;

    if (days[i] <= today) {
      const dayEnd = new Date(days[i]);
      dayEnd.setHours(23, 59, 59, 999);
      const donePoints = tasks
        .filter((t) => t.status === 'done' && new Date(t.updatedAt) <= dayEnd)
        .reduce((s, t) => s + t.storyPoints, 0);
      actual = Math.max(0, total - donePoints);
    }

    result.push({ date, ideal: Math.round(ideal * 10) / 10, actual: Math.round(actual * 10) / 10 });
  }
  return result;
}

function generateWorkload(): Workload[] {
  return TEAM_MEMBERS.map((m) => {
    const memberTasks = tasks.filter(
      (t) => t.assigneeId === m.id && t.status !== 'done' && t.sprintId === SAMPLE_SPRINT.id
    );
    const totalTasks = tasks.filter((t) => t.assigneeId === m.id && t.sprintId === SAMPLE_SPRINT.id);
    return {
      memberId: m.id,
      memberName: m.name,
      avatarColor: m.avatarColor,
      assignedCount: totalTasks.length,
      remainingPoints: memberTasks.reduce((s, t) => s + t.storyPoints, 0),
      capacity: m.capacity,
    };
  });
}

router.get('/members', (_req: Request, res: Response) => {
  res.json(TEAM_MEMBERS);
});

router.get('/sprint', (_req: Request, res: Response) => {
  const doneCount = tasks.filter((t) => t.status === 'done' && t.sprintId === SAMPLE_SPRINT.id).length;
  const totalCount = tasks.filter((t) => t.sprintId === SAMPLE_SPRINT.id).length;
  res.json({
    sprint: SAMPLE_SPRINT,
    burndown: generateBurndownData(),
    workload: generateWorkload(),
    stats: { doneCount, totalCount },
  });
});

router.get('/tasks', (_req: Request, res: Response) => {
  res.json(tasks);
});

router.post('/tasks', (req: Request, res: Response) => {
  const { title, description, assigneeId, priority, storyPoints } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '任务标题不能为空' });
  }
  const newTask: Task = {
    id: uuidv4(),
    title: title.trim(),
    description: (description || '').trim(),
    assigneeId: assigneeId || null,
    priority: priority || 'medium',
    status: 'todo',
    storyPoints: Number(storyPoints) || 3,
    sprintId: SAMPLE_SPRINT.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

router.put('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const upd = req.body;
  tasks[idx] = {
    ...tasks[idx],
    ...(upd.title !== undefined ? { title: upd.title.trim() } : {}),
    ...(upd.description !== undefined ? { description: upd.description.trim() } : {}),
    ...(upd.assigneeId !== undefined ? { assigneeId: upd.assigneeId } : {}),
    ...(upd.priority !== undefined ? { priority: upd.priority } : {}),
    ...(upd.status !== undefined ? { status: upd.status } : {}),
    ...(upd.storyPoints !== undefined ? { storyPoints: Number(upd.storyPoints) } : {}),
    updatedAt: new Date().toISOString(),
  };
  res.json(tasks[idx]);
});

router.patch('/tasks/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid: TaskStatus[] = ['todo', 'in_progress', 'done'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: '无效的任务状态' });
  }
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  tasks[idx] = { ...tasks[idx], status, updatedAt: new Date().toISOString() };
  res.json(tasks[idx]);
});

router.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const [removed] = tasks.splice(idx, 1);
  res.json(removed);
});

export default router;
