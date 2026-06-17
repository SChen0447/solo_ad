import { Router } from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  updateTaskOrder,
  deleteTask
} from '../data.js';

const router = Router();

router.get('/', (req, res) => {
  const tasks = getAllTasks();
  res.json(tasks);
});

router.get('/:id', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.post('/', (req, res) => {
  const { title, description, priority, dueDate, assignee, status } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newTask = createTask({
    title,
    description: description || '',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    assignee: assignee || '',
    status: status || 'todo'
  });
  
  res.status(201).json(newTask);
});

router.patch('/:id', (req, res) => {
  const task = updateTask(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const task = updateTaskStatus(req.params.id, status);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.put('/:id/order', (req, res) => {
  const { order } = req.body;
  if (order === undefined || order === null) {
    return res.status(400).json({ error: 'Order is required' });
  }
  const task = updateTaskOrder(req.params.id, order);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const deleted = deleteTask(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).send();
});

export default router;
