import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import type { Project, CanvasElement, OnlineUser, StrokeElement, StickyElement, ArrowElement } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

interface ProjectData {
  project: Project;
  elements: Map<string, CanvasElement>;
  users: Map<string, OnlineUser>;
}

const projects = new Map<string, ProjectData>();

function createDefaultProject() {
  const projectId = uuidv4();
  const now = Date.now();
  const project: Project = {
    id: projectId,
    name: '默认项目',
    createdAt: now,
    updatedAt: now,
  };
  projects.set(projectId, {
    project,
    elements: new Map(),
    users: new Map(),
  });
  return project;
}

createDefaultProject();

function getProjectData(projectId: string): ProjectData | undefined {
  return projects.get(projectId);
}

function getAllProjects(): Project[] {
  return Array.from(projects.values()).map(p => p.project);
}

app.get('/api/projects', (req, res) => {
  const projectList = getAllProjects().sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(projectList);
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  const projectId = uuidv4();
  const now = Date.now();
  const project: Project = {
    id: projectId,
    name: name || '新项目',
    createdAt: now,
    updatedAt: now,
  };
  projects.set(projectId, {
    project,
    elements: new Map(),
    users: new Map(),
  });
  res.status(201).json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(data.project);
});

app.put('/api/projects/:id', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const { name } = req.body;
  if (name) {
    data.project.name = name;
    data.project.updatedAt = Date.now();
  }
  res.json(data.project);
});

app.delete('/api/projects/:id', (req, res) => {
  const deleted = projects.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  if (projects.size === 0) {
    createDefaultProject();
  }
  res.json({ success: true });
});

app.get('/api/projects/:id/elements', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  
  if (since > 0) {
    const updated: CanvasElement[] = [];
    const deleted: string[] = [];
    
    data.elements.forEach((element, id) => {
      if (element.updatedAt > since) {
        if (element.deleted) {
          deleted.push(id);
        } else {
          updated.push(element);
        }
      }
    });
    
    res.json({ elements: updated, deleted });
  } else {
    const elements = Array.from(data.elements.values()).filter(e => !e.deleted);
    res.json(elements);
  }
});

app.post('/api/projects/:id/elements', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const element = req.body as CanvasElement;
  const now = Date.now();
  
  element.id = element.id || uuidv4();
  element.updatedAt = now;
  element.deleted = false;
  
  data.elements.set(element.id, element);
  data.project.updatedAt = now;
  
  res.status(201).json(element);
});

app.put('/api/projects/:id/elements/:elementId', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const elementId = req.params.elementId;
  const existing = data.elements.get(elementId);
  
  if (!existing) {
    res.status(404).json({ error: '元素不存在' });
    return;
  }
  
  const updated = { ...existing, ...req.body, id: elementId, updatedAt: Date.now() } as CanvasElement;
  data.elements.set(elementId, updated);
  data.project.updatedAt = Date.now();
  
  res.json(updated);
});

app.delete('/api/projects/:id/elements/:elementId', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const elementId = req.params.elementId;
  const element = data.elements.get(elementId);
  
  if (!element) {
    res.status(404).json({ error: '元素不存在' });
    return;
  }
  
  element.deleted = true;
  element.updatedAt = Date.now();
  data.project.updatedAt = Date.now();
  
  res.json({ success: true });
});

app.post('/api/projects/:id/users', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const { nickname } = req.body;
  const userId = uuidv4();
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFC107', '#9B59B6', '#E74C3C', '#2ECC71', '#3498DB'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const user: OnlineUser = {
    id: userId,
    nickname: nickname || '匿名用户',
    color,
    cursorX: 0,
    cursorY: 0,
    lastActive: Date.now(),
  };
  
  data.users.set(userId, user);
  res.json({ userId, color });
});

app.delete('/api/projects/:id/users/:userId', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  data.users.delete(req.params.userId);
  res.json({ success: true });
});

app.get('/api/projects/:id/users', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const now = Date.now();
  const timeout = 10000;
  
  const activeUsers: OnlineUser[] = [];
  data.users.forEach((user, id) => {
    if (now - user.lastActive < timeout) {
      activeUsers.push(user);
    } else {
      data.users.delete(id);
    }
  });
  
  res.json(activeUsers);
});

app.put('/api/projects/:id/users/:userId', (req, res) => {
  const data = getProjectData(req.params.id);
  if (!data) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  
  const userId = req.params.userId;
  const user = data.users.get(userId);
  
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  
  const { x, y } = req.body;
  if (x !== undefined) user.cursorX = x;
  if (y !== undefined) user.cursorY = y;
  user.lastActive = Date.now();
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
