import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';

const router = Router();

interface FeedbackRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

const VALID_CATEGORIES = ['功能建议', 'Bug报告', '其他'];
const VALID_STATUSES = ['待处理', '处理中', '已完成'];

router.get('/feedback', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM feedback ORDER BY createdAt DESC').all() as FeedbackRow[];
  res.json(rows);
});

router.post('/feedback', (req: Request, res: Response) => {
  const { title, description, category } = req.body;
  if (!title || !description) {
    res.status(400).json({ error: '标题和描述为必填项' });
    return;
  }
  const cat = VALID_CATEGORIES.includes(category) ? category : '其他';
  const id = uuidv4();
  db.prepare(
    'INSERT INTO feedback (id, title, description, category, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title.trim(), description.trim(), cat, '待处理');
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow;
  res.status(201).json(row);
});

router.put('/feedback/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, title, description, category } = req.body;
  const existing = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow | undefined;
  if (!existing) {
    res.status(404).json({ error: '反馈不存在' });
    return;
  }
  const newStatus = VALID_STATUSES.includes(status) ? status : existing.status;
  const newTitle = title ?? existing.title;
  const newDesc = description ?? existing.description;
  const newCat = VALID_CATEGORIES.includes(category) ? category : existing.category;
  db.prepare(
    'UPDATE feedback SET title = ?, description = ?, category = ?, status = ? WHERE id = ?'
  ).run(newTitle, newDesc, newCat, newStatus, id);
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow;
  res.json(row);
});

router.delete('/feedback/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow | undefined;
  if (!existing) {
    res.status(404).json({ error: '反馈不存在' });
    return;
  }
  db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
  res.json({ success: true });
});

router.get('/feedback/stats', (_req: Request, res: Response) => {
  const byCategory = db.prepare(
    'SELECT category, COUNT(*) as count FROM feedback GROUP BY category'
  ).all() as { category: string; count: number }[];

  const byStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM feedback GROUP BY status'
  ).all() as { status: string; count: number }[];

  const total = (db.prepare('SELECT COUNT(*) as count FROM feedback').get() as { count: number }).count;

  res.json({ byCategory, byStatus, total });
});

export default router;
