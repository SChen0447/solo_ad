import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app1 = express();
const app2 = express();

app1.use(cors());
app1.use(express.json());
app2.use(cors());
app2.use(express.json());

interface User {
  id: string;
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  reminderEnabled: boolean;
}

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface Plan {
  id: string;
  userId: string;
  goalName: string;
  goalDescription: string;
  dailyHours: number;
  duration: number;
  tasks: Task[];
  createdAt: string;
  progress: number;
}

const users: User[] = [];
const plans: Plan[] = [];
const tasks: Task[] = [];

function generatePlanTasks(goalName: string, goalDescription: string, dailyHours: number, duration: number, planId: string): Task[] {
  const generatedTasks: Task[] = [];
  const totalMinutes = dailyHours * 60;
  const phases = [
    '基础概念学习',
    '核心知识掌握',
    '实践练习',
    '深入理解',
    '综合应用',
    '复习巩固',
    '拓展提升'
  ];

  const startDate = new Date();

  for (let day = 0; day < duration; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    const phaseIndex = Math.min(Math.floor((day / duration) * phases.length), phases.length - 1);
    const phase = phases[phaseIndex];

    const tasksPerDay = Math.max(2, Math.min(5, Math.floor(totalMinutes / 30)));
    const minutesPerTask = Math.floor(totalMinutes / tasksPerDay);

    for (let t = 0; t < tasksPerDay; t++) {
      const taskTypes = [
        `阅读${phase}相关资料`,
        `完成${phase}笔记整理`,
        `观看${phase}教学视频`,
        `练习${phase}相关习题`,
        `总结${phase}要点`,
        `复习前一天内容`,
        `完成小测验`,
        `参与讨论与思考`
      ];
      const taskType = taskTypes[(day + t) % taskTypes.length];

      generatedTasks.push({
        id: uuidv4(),
        planId,
        date: dateStr,
        title: `Day${day + 1}: ${taskType}`,
        estimatedMinutes: minutesPerTask,
        completed: false
      });
    }
  }

  return generatedTasks;
}

function calculateProgress(planId: string): number {
  const planTasks = tasks.filter(t => t.planId === planId);
  if (planTasks.length === 0) return 0;
  const completed = planTasks.filter(t => t.completed).length;
  return Math.round((completed / planTasks.length) * 100);
}

// Auth routes
app1.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const existing = users.find(u => u.username === username);
  if (existing) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }
  const user: User = {
    id: uuidv4(),
    username,
    password,
    nickname: username,
    avatar: '',
    reminderEnabled: false
  };
  users.push(user);
  res.json({ user: { ...user, password: undefined }, token: user.id });
});

app1.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  res.json({ user: { ...user, password: undefined }, token: user.id });
});

// Plan routes
app1.post('/api/plans', (req, res) => {
  const { goalName, goalDescription, dailyHours, duration, userId } = req.body;
  const plan: Plan = {
    id: uuidv4(),
    userId,
    goalName,
    goalDescription,
    dailyHours,
    duration,
    tasks: [],
    createdAt: new Date().toISOString(),
    progress: 0
  };

  const generatedTasks = generatePlanTasks(goalName, goalDescription, dailyHours, duration, plan.id);
  plan.tasks = generatedTasks;
  tasks.push(...generatedTasks);
  plans.push(plan);

  res.json(plan);
});

app1.get('/api/plans', (req, res) => {
  const { userId } = req.query;
  const userPlans = plans
    .filter(p => p.userId === userId)
    .map(p => ({ ...p, tasks: tasks.filter(t => t.planId === p.id), progress: calculateProgress(p.id) }));
  res.json(userPlans);
});

app1.get('/api/plans/:id', (req, res) => {
  const plan = plans.find(p => p.id === req.params.id);
  if (!plan) {
    res.status(404).json({ error: '计划不存在' });
    return;
  }
  res.json({ ...plan, tasks: tasks.filter(t => t.planId === plan.id), progress: calculateProgress(plan.id) });
});

// User profile routes
app1.put('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  if (req.body.nickname !== undefined) user.nickname = req.body.nickname;
  if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
  if (req.body.reminderEnabled !== undefined) user.reminderEnabled = req.body.reminderEnabled;
  res.json({ ...user, password: undefined });
});

// Task status service routes (port 3002)
app2.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  task.completed = req.body.completed;
  const progress = calculateProgress(task.planId);
  const plan = plans.find(p => p.id === task.planId);
  if (plan) plan.progress = progress;
  res.json({ progress });
});

app2.get('/api/tasks/plan/:planId', (req, res) => {
  const planTasks = tasks.filter(t => t.planId === req.params.planId);
  res.json(planTasks);
});

app1.listen(3001, () => {
  console.log('Plan generation service running on port 3001');
});

app2.listen(3002, () => {
  console.log('Task status service running on port 3002');
});
