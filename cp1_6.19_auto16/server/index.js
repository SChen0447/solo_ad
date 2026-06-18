const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

let projects = [];
let tasks = [];

const sampleProjectId = uuidv4();
projects.push({
  id: sampleProjectId,
  name: '示例项目',
  description: '这是一个示例项目，用于展示看板功能',
  createdAt: Date.now() - 86400000
});

const sampleTasks = [
  {
    id: uuidv4(),
    projectId: sampleProjectId,
    title: '设计系统架构',
    description: '完成整体系统架构设计，包括前端、后端和数据库选型',
    status: 'done',
    priority: 'high',
    createdAt: Date.now() - 7200000,
    totalTime: 3600000,
    isRunning: false,
    currentStartTime: null,
    timeRecords: [
      { start: Date.now() - 7200000, end: Date.now() - 3600000 }
    ]
  },
  {
    id: uuidv4(),
    projectId: sampleProjectId,
    title: '开发用户模块',
    description: '实现用户注册、登录和个人信息管理功能',
    status: 'in-progress',
    priority: 'high',
    createdAt: Date.now() - 3600000,
    totalTime: 1800000,
    isRunning: false,
    currentStartTime: null,
    timeRecords: [
      { start: Date.now() - 3600000, end: Date.now() - 1800000 }
    ]
  },
  {
    id: uuidv4(),
    projectId: sampleProjectId,
    title: '编写单元测试',
    description: '为核心业务逻辑编写单元测试用例',
    status: 'todo',
    priority: 'medium',
    createdAt: Date.now() - 1800000,
    totalTime: 0,
    isRunning: false,
    currentStartTime: null,
    timeRecords: []
  },
  {
    id: uuidv4(),
    projectId: sampleProjectId,
    title: '优化页面性能',
    description: '对首页进行性能优化，提升加载速度',
    status: 'todo',
    priority: 'low',
    createdAt: Date.now() - 600000,
    totalTime: 0,
    isRunning: false,
    currentStartTime: null,
    timeRecords: []
  }
];
tasks = [...sampleTasks];

const activeTimers = new Map();

setInterval(() => {
  const now = Date.now();
  tasks.forEach(task => {
    if (task.isRunning && task.currentStartTime) {
      const elapsed = now - task.currentStartTime;
      task.totalTime = task.totalTime + elapsed;
      task.currentStartTime = now;
    }
  });
}, 1000);

app.get('/projects', (req, res) => {
  res.json(projects);
});

app.post('/projects', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: '项目名称不能为空' });
  }
  const project = {
    id: uuidv4(),
    name,
    description: description || '',
    createdAt: Date.now()
  };
  projects.push(project);
  io.emit('project:created', project);
  res.status(201).json(project);
});

app.get('/projects/:id/tasks', (req, res) => {
  const { id } = req.params;
  const projectTasks = tasks.filter(t => t.projectId === id);
  res.json(projectTasks);
});

app.post('/tasks', (req, res) => {
  const { projectId, title, description, priority } = req.body;
  if (!projectId || !title) {
    return res.status(400).json({ error: '项目ID和任务标题不能为空' });
  }
  const task = {
    id: uuidv4(),
    projectId,
    title,
    description: description || '',
    status: 'todo',
    priority: priority || 'medium',
    createdAt: Date.now(),
    totalTime: 0,
    isRunning: false,
    currentStartTime: null,
    timeRecords: []
  };
  tasks.push(task);
  io.emit('task:created', task);
  res.status(201).json(task);
});

app.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const updates = req.body;
  const task = tasks[taskIndex];

  if (updates.status && updates.status !== task.status) {
    task.status = updates.status;
    io.emit('task:updated', { id, status: updates.status });
  }

  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.priority !== undefined) task.priority = updates.priority;

  res.json(task);
});

app.get('/tasks/:id/timer', (req, res) => {
  const { id } = req.params;
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  res.json({
    isRunning: task.isRunning,
    totalTime: task.totalTime,
    currentStartTime: task.currentStartTime,
    timeRecords: task.timeRecords
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('timer:start', ({ taskId }) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.isRunning) {
      const now = Date.now();
      task.isRunning = true;
      task.currentStartTime = now;
      task.timeRecords.push({ start: now, end: null });
      io.emit('timer:started', {
        taskId,
        isRunning: true,
        currentStartTime: now,
        totalTime: task.totalTime
      });
    }
  });

  socket.on('timer:pause', ({ taskId }) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.isRunning) {
      const now = Date.now();
      const elapsed = now - task.currentStartTime;
      task.isRunning = false;
      task.totalTime += elapsed;
      task.currentStartTime = null;
      if (task.timeRecords.length > 0) {
        const lastRecord = task.timeRecords[task.timeRecords.length - 1];
        if (lastRecord.end === null) {
          lastRecord.end = now;
        }
      }
      io.emit('timer:paused', {
        taskId,
        isRunning: false,
        totalTime: task.totalTime,
        timeRecords: task.timeRecords
      });
    }
  });

  socket.on('task:move', ({ taskId, newStatus }) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      io.emit('task:moved', { taskId, newStatus });
    }
  });

  socket.on('task:reorder', ({ projectId, status, taskIds }) => {
    io.emit('task:reordered', { projectId, status, taskIds });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
