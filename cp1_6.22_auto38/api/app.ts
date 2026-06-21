import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  getProjects,
  getProjectById,
  createProject,
  getMembersByProject,
  addMember,
  getTagsByProject,
  addTag,
  deleteTag,
  getEntriesByProject,
  createEntry,
  deleteEntry,
} from './database.js';
import type {
  CreateProjectPayload,
  CreateMemberPayload,
  CreateTagPayload,
  CreateEntryPayload,
  Period,
} from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' });
});

app.get('/api/projects', (_req: Request, res: Response, next: NextFunction): void => {
  try {
    const projects = getProjects();
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

app.post('/api/projects', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const payload = req.body as CreateProjectPayload;
    if (!payload.name || !payload.name.trim()) {
      res.status(400).json({ success: false, error: '项目名称不能为空' });
      return;
    }
    if (!Array.isArray(payload.members)) {
      res.status(400).json({ success: false, error: '成员信息格式错误' });
      return;
    }
    const project = createProject(payload);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects/:id/members', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const members = getMembersByProject(projectId);
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
});

app.post('/api/projects/:id/members', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const payload = req.body as CreateMemberPayload;
    if (!payload.nickname?.trim() || !payload.email?.trim()) {
      res.status(400).json({ success: false, error: '昵称和邮箱不能为空' });
      return;
    }
    const member = addMember(projectId, payload);
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects/:id/tags', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const tags = getTagsByProject(projectId);
    res.json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
});

app.post('/api/projects/:id/tags', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const payload = req.body as CreateTagPayload;
    if (!payload.name?.trim()) {
      res.status(400).json({ success: false, error: '标签名不能为空' });
      return;
    }
    const tag = addTag(projectId, payload);
    res.json({ success: true, data: tag });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/tags/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tagId = parseInt(req.params.id, 10);
    deleteTag(tagId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects/:id/entries', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const period = (req.query.period as Period) || 'week';
    const anchorDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const entries = getEntriesByProject(projectId, period, anchorDate);
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

app.post('/api/projects/:id/entries', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = getProjectById(projectId);
    if (!project) {
      res.status(404).json({ success: false, error: '项目不存在' });
      return;
    }
    const payload = req.body as CreateEntryPayload;
    if (!payload.memberId || !payload.date || !payload.hours || !payload.description?.trim()) {
      res.status(400).json({ success: false, error: '请填写完整的工时信息' });
      return;
    }
    if (payload.hours < 0.5 || payload.hours > 24) {
      res.status(400).json({ success: false, error: '工时必须在 0.5 到 24 小时之间' });
      return;
    }
    if (!Array.isArray(payload.tagIds)) {
      res.status(400).json({ success: false, error: '标签格式错误' });
      return;
    }
    if (payload.tagIds.length > 3) {
      res.status(400).json({ success: false, error: '最多只能选择 3 个标签' });
      return;
    }
    const entry = createEntry(projectId, payload);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/entries/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const entryId = parseInt(req.params.id, 10);
    deleteEntry(entryId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

export default app;
