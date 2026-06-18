import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { projects, findProjectById, calculateHealthMetrics } from '../store';
import type { Task, TaskStatus, Project } from '../types';

const router = Router();

router.get('/api/projects', (_req: Request, res: Response) => {
  const lightweight = projects.map(p => ({
    id: p.id,
    name: p.name,
    members: p.members,
    taskCount: p.tasks.length,
    createdAt: p.createdAt,
  }));
  res.json(lightweight);
});

router.get('/api/projects/:id', (req: Request, res: Response) => {
  const project = findProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

router.get('/api/projects/:id/health', (req: Request, res: Response) => {
  const project = findProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(calculateHealthMetrics(project));
});

router.post('/api/projects', (req: Request, res: Response) => {
  const { name, members } = req.body;
  if (!name || !Array.isArray(members)) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const project: Project = {
    id: uuidv4(),
    name,
    members,
    tasks: [],
    createdAt: new Date().toISOString(),
  };
  projects.push(project);
  const io = (req as any).io;
  if (io) io.emit('project:created', project);
  res.status(201).json(project);
});

router.post('/api/projects/:id/tasks', (req: Request, res: Response) => {
  const project = findProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { title, description, dueDate, assignee, estimatedHours, status } = req.body;
  if (!title || !assignee) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    title,
    description: description || '',
    status: (status || 'todo') as TaskStatus,
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    assignee,
    estimatedHours: Number(estimatedHours) || 4,
    createdAt: now,
    history: [{ status: (status || 'todo') as TaskStatus, timestamp: now }],
  };
  project.tasks.push(task);
  const io = (req as any).io;
  if (io) io.emit(`project:${project.id}:task:created`, task);
  res.status(201).json(task);
});

router.patch('/api/tasks/:id', (req: Request, res: Response) => {
  const taskId = req.params.id;
  const { title, description, dueDate, assignee, estimatedHours } = req.body;
  for (const project of projects) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignee !== undefined) task.assignee = assignee;
      if (estimatedHours !== undefined) task.estimatedHours = Number(estimatedHours);
      const io = (req as any).io;
      if (io) io.emit(`project:${project.id}:task:updated`, task);
      return res.json(task);
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

router.put('/api/tasks/:id/move', (req: Request, res: Response) => {
  const taskId = req.params.id;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }
  const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
  if (!validStatuses.includes(status as TaskStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  for (const project of projects) {
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = project.tasks[taskIndex];
      if (task.status !== status) {
        task.status = status as TaskStatus;
        task.history.push({
          status: status as TaskStatus,
          timestamp: new Date().toISOString(),
        });
      }
      const io = (req as any).io;
      if (io) io.emit(`project:${project.id}:task:moved`, { task, projectId: project.id });
      return res.json(task);
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

router.get('/api/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const results: Array<{
    type: 'project' | 'task';
    id: string;
    projectId: string;
    title: string;
    subtitle: string;
  }> = [];
  for (const p of projects) {
    if (p.name.toLowerCase().includes(q)) {
      results.push({
        type: 'project',
        id: p.id,
        projectId: p.id,
        title: p.name,
        subtitle: `${p.tasks.length} 个任务`,
      });
    }
    for (const t of p.tasks) {
      if (t.title.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          id: t.id,
          projectId: p.id,
          title: t.title,
          subtitle: `${p.name} · ${t.assignee}`,
        });
      }
    }
  }
  res.json(results.slice(0, 20));
});

export default router;
