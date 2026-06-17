import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { users, plans, tasks, generatePlanTasks, calculateProgress, User, Plan, Task } from './services/planGenerator';
import { toggleTaskStatus, getTasksByPlan, reorderTasks } from './services/taskTracker';

const planApp = express();
const taskApp = express();

planApp.use(cors());
planApp.use(express.json());
taskApp.use(cors());
taskApp.use(express.json());

planApp.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const existing = users.find((u: User) => u.username === username);
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
    reminderEnabled: false,
  };
  users.push(user);
  res.json({ user: { ...user, password: undefined }, token: user.id });
});

planApp.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u: User) => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  res.json({ user: { ...user, password: undefined }, token: user.id });
});

planApp.post('/api/plans', (req, res) => {
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
    progress: 0,
  };

  const generatedTasks = generatePlanTasks(goalName, goalDescription, dailyHours, duration, plan.id);
  plan.tasks = generatedTasks;
  tasks.push(...generatedTasks);
  plans.push(plan);

  res.json({ ...plan, progress: 0 });
});

planApp.get('/api/plans', (req, res) => {
  const { userId } = req.query;
  const userPlans = plans
    .filter((p: Plan) => p.userId === userId)
    .map((p: Plan) => ({
      ...p,
      tasks: tasks.filter((t: Task) => t.planId === p.id),
      progress: calculateProgress(p.id),
    }));
  res.json(userPlans);
});

planApp.get('/api/plans/:id', (req, res) => {
  const plan = plans.find((p: Plan) => p.id === req.params.id);
  if (!plan) {
    res.status(404).json({ error: '计划不存在' });
    return;
  }
  res.json({
    ...plan,
    tasks: tasks.filter((t: Task) => t.planId === plan.id),
    progress: calculateProgress(plan.id),
  });
});

planApp.put('/api/users/:id', (req, res) => {
  const user = users.find((u: User) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  if (req.body.nickname !== undefined) user.nickname = req.body.nickname;
  if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
  if (req.body.reminderEnabled !== undefined) user.reminderEnabled = req.body.reminderEnabled;
  res.json({ ...user, password: undefined });
});

planApp.get('/api/users/:id', (req, res) => {
  const user = users.find((u: User) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({ ...user, password: undefined });
});

taskApp.patch('/api/tasks/:id', (req, res) => {
  const result = toggleTaskStatus(req.params.id, req.body.completed);
  if (!result) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  res.json(result);
});

taskApp.get('/api/tasks/plan/:planId', (req, res) => {
  const planTasks = getTasksByPlan(req.params.planId);
  res.json(planTasks);
});

taskApp.put('/api/reorder', (req, res) => {
  const { planId, date, taskIds } = req.body;
  if (!planId || !date || !Array.isArray(taskIds)) {
    res.status(400).json({ error: '参数无效' });
    return;
  }
  const success = reorderTasks(planId, date, taskIds);
  if (!success) {
    res.status(400).json({ error: '排序失败' });
    return;
  }
  res.json({ success: true });
});

planApp.listen(3001, () => {
  console.log('Plan generation service running on port 3001');
});

taskApp.listen(3002, () => {
  console.log('Task status service running on port 3002');
});
