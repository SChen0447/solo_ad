import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  addTask,
  updateTask,
  deleteTask,
  addComment,
  getColumns,
  addColumn,
} from '../models/task';

const router = Router();

router.get('/tasks', (_req, res) => {
  const tasks = getTasks();
  res.json(tasks);
});

router.post('/tasks', (req, res) => {
  const { title, description, assignee, dueDate, columnId } = req.body;
  
  if (!title || !columnId) {
    return res.status(400).json({ error: '标题和列ID不能为空' });
  }
  
  const newTask = addTask({
    title,
    description: description || '',
    assignee: assignee || '',
    dueDate: dueDate || '',
    columnId,
  });
  
  res.status(201).json(newTask);
});

router.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const updatedTask = updateTask(id, updates);
  if (!updatedTask) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.json(updatedTask);
});

router.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  const success = deleteTask(id);
  if (!success) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.json({ message: '删除成功' });
});

router.post('/tasks/:id/comments', (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  
  if (!content || !author) {
    return res.status(400).json({ error: '内容和作者不能为空' });
  }
  
  const newComment = addComment(id, content, author);
  if (!newComment) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  res.status(201).json(newComment);
});

router.get('/columns', (_req, res) => {
  const columns = getColumns();
  res.json(columns);
});

router.post('/columns', (req, res) => {
  const { title } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '列标题不能为空' });
  }
  
  const newColumn = addColumn(title);
  res.status(201).json(newColumn);
});

export default router;
