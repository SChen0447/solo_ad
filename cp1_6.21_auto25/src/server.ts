import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

interface Material {
  id: string;
  name: string;
  category: string;
  total: number;
  allocated: number;
  available: number;
  image?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  area: string;
  type: string;
  requiredPeople: number;
  currentPeople: number;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: 'pending' | 'en_route' | 'arrived' | 'completed';
  volunteers: string[];
}

interface ChatMessage {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  type: 'text' | 'emoji';
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'volunteer';
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let materials: Material[] = [
  { id: uuidv4(), name: '矿泉水', category: '饮品', total: 500, allocated: 100, available: 400 },
  { id: uuidv4(), name: '面包', category: '食品', total: 300, allocated: 150, available: 150 },
  { id: uuidv4(), name: '急救包', category: '医疗', total: 50, allocated: 30, available: 20 },
  { id: uuidv4(), name: '手电筒', category: '工具', total: 80, allocated: 20, available: 60 },
  { id: uuidv4(), name: '毛毯', category: '生活用品', total: 200, allocated: 180, available: 20 },
  { id: uuidv4(), name: '口罩', category: '防护', total: 1000, allocated: 200, available: 800 },
  { id: uuidv4(), name: '消毒液', category: '防护', total: 100, allocated: 85, available: 15 },
  { id: uuidv4(), name: '雨衣', category: '防护', total: 150, allocated: 50, available: 100 },
];

let tasks: Task[] = [
  {
    id: uuidv4(),
    title: '物资打包 - 食品区',
    description: '将食品类物资按份打包，每份包含面包2个、矿泉水1瓶',
    area: 'A区-仓库',
    type: 'packing',
    requiredPeople: 5,
    currentPeople: 3,
    deadline: '2024-12-25 18:00',
    status: 'in_progress',
    progress: 'pending',
    volunteers: ['user1', 'user2', 'user3'],
  },
  {
    id: uuidv4(),
    title: '运输配送 - 东区',
    description: '将打包好的物资运送到东区分发点',
    area: 'B区-运输',
    type: 'transport',
    requiredPeople: 3,
    currentPeople: 3,
    deadline: '2024-12-25 20:00',
    status: 'in_progress',
    progress: 'en_route',
    volunteers: ['user4', 'user5', 'user6'],
  },
  {
    id: uuidv4(),
    title: '现场分发 - 中心广场',
    description: '在中心广场为受灾群众分发物资',
    area: 'C区-现场',
    type: 'distribution',
    requiredPeople: 8,
    currentPeople: 2,
    deadline: '2024-12-26 12:00',
    status: 'pending',
    progress: 'pending',
    volunteers: ['user7', 'user8'],
  },
  {
    id: uuidv4(),
    title: '医疗物资整理',
    description: '整理清点医疗类物资，确保急救包物品齐全',
    area: 'A区-仓库',
    type: 'packing',
    requiredPeople: 2,
    currentPeople: 0,
    deadline: '2024-12-25 16:00',
    status: 'pending',
    progress: 'pending',
    volunteers: [],
  },
  {
    id: uuidv4(),
    title: '夜间巡逻 - 南区',
    description: '夜间在南区巡逻，排查安全隐患',
    area: 'D区-南区',
    type: 'patrol',
    requiredPeople: 4,
    currentPeople: 1,
    deadline: '2024-12-26 06:00',
    status: 'pending',
    progress: 'pending',
    volunteers: ['user9'],
  },
];

let chatMessages: ChatMessage[] = [
  {
    id: uuidv4(),
    taskId: tasks[0].id,
    userId: 'user1',
    userName: '张小明',
    avatar: '🧑',
    content: '大家好，我们开始打包吧',
    type: 'text',
    timestamp: Date.now() - 3600000,
  },
  {
    id: uuidv4(),
    taskId: tasks[0].id,
    userId: 'user2',
    userName: '李华',
    avatar: '👩',
    content: '✅收到，马上到',
    type: 'emoji',
    timestamp: Date.now() - 3500000,
  },
  {
    id: uuidv4(),
    taskId: tasks[0].id,
    userId: 'user3',
    userName: '王芳',
    avatar: '👨',
    content: '目前已经打包了50份了',
    type: 'text',
    timestamp: Date.now() - 1800000,
  },
];

let users: Record<string, User> = {
  user1: { id: 'user1', name: '张小明', avatar: '🧑', role: 'volunteer' },
  user2: { id: 'user2', name: '李华', avatar: '👩', role: 'volunteer' },
  user3: { id: 'user3', name: '王芳', avatar: '👨', role: 'volunteer' },
  current: { id: 'current', name: '我', avatar: '😊', role: 'volunteer' },
};

const currentUserId = 'current';

app.get('/api/materials', (_req: Request, res: Response) => {
  res.json(materials);
});

app.post('/api/materials', (req: Request, res: Response) => {
  const newMaterial: Material = {
    id: uuidv4(),
    ...req.body,
    available: req.body.total - (req.body.allocated || 0),
  };
  materials.push(newMaterial);
  io.emit('material:update', materials);
  res.status(201).json(newMaterial);
});

app.post('/api/materials/batch', (req: Request, res: Response) => {
  const newMaterials: Material[] = req.body.map((item: Partial<Material>) => ({
    id: uuidv4(),
    name: item.name || '',
    category: item.category || '未分类',
    total: item.total || 0,
    allocated: item.allocated || 0,
    available: (item.total || 0) - (item.allocated || 0),
  }));
  materials = [...materials, ...newMaterials];
  io.emit('material:update', materials);
  res.status(201).json(newMaterials);
});

app.post('/api/materials/import', (req: Request, res: Response) => {
  const csvData = req.body.csv;
  if (!csvData) {
    return res.status(400).json({ error: 'No CSV data provided' });
  }

  const result = Papa.parse<{ name: string; category: string; total: string; allocated: string }>(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const importedMaterials: Material[] = result.data
    .filter((row) => row.name)
    .map((row) => ({
      id: uuidv4(),
      name: row.name,
      category: row.category || '未分类',
      total: parseInt(row.total) || 0,
      allocated: parseInt(row.allocated) || 0,
      available: (parseInt(row.total) || 0) - (parseInt(row.allocated) || 0),
    }));

  materials = [...materials, ...importedMaterials];
  io.emit('material:update', materials);
  res.status(201).json(importedMaterials);
});

app.put('/api/materials/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Material not found' });
  }
  const updated = {
    ...materials[index],
    ...req.body,
    available: (req.body.total ?? materials[index].total) - (req.body.allocated ?? materials[index].allocated),
  };
  materials[index] = updated;
  io.emit('material:update', materials);
  res.json(updated);
});

app.delete('/api/materials/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  materials = materials.filter((m) => m.id !== id);
  io.emit('material:update', materials);
  res.json({ success: true });
});

app.get('/api/tasks', (_req: Request, res: Response) => {
  res.json(tasks);
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const newTask: Task = {
    id: uuidv4(),
    status: 'pending',
    progress: 'pending',
    currentPeople: 0,
    volunteers: [],
    ...req.body,
  };
  tasks.push(newTask);
  io.emit('task:update', tasks);
  res.status(201).json(newTask);
});

app.post('/api/tasks/:id/claim', (req: Request, res: Response) => {
  const id = req.params.id;
  const { userId } = req.body;
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.currentPeople >= task.requiredPeople) {
    return res.status(400).json({ error: 'Task is full' });
  }
  if (task.volunteers.includes(userId)) {
    return res.status(400).json({ error: 'Already claimed' });
  }
  task.volunteers.push(userId);
  task.currentPeople = task.volunteers.length;
  if (task.currentPeople > 0 && task.status === 'pending') {
    task.status = 'in_progress';
  }
  io.emit('task:update', tasks);
  res.json(task);
});

app.post('/api/tasks/:id/progress', (req: Request, res: Response) => {
  const id = req.params.id;
  const { progress } = req.body;
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  task.progress = progress;
  if (progress === 'completed') {
    task.status = 'completed';
  }
  io.emit('task:update', tasks);
  io.emit('task:progress', { taskId: id, progress });
  res.json(task);
});

app.get('/api/tasks/:id/messages', (req: Request, res: Response) => {
  const taskId = req.params.id;
  const taskMessages = chatMessages.filter((m) => m.taskId === taskId);
  res.json(taskMessages);
});

app.get('/api/user/current', (_req: Request, res: Response) => {
  res.json(users[currentUserId]);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.emit('materials:initial', materials);
  socket.emit('tasks:initial', tasks);

  socket.on('chat:message', (data: { taskId: string; content: string; type: 'text' | 'emoji' }) => {
    const user = users[currentUserId];
    const message: ChatMessage = {
      id: uuidv4(),
      taskId: data.taskId,
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      content: data.content,
      type: data.type,
      timestamp: Date.now(),
    };
    chatMessages.push(message);
    io.emit('chat:newMessage', message);
  });

  socket.on('task:claim', (data: { taskId: string; userId: string }) => {
    const task = tasks.find((t) => t.id === data.taskId);
    if (!task || task.currentPeople >= task.requiredPeople) return;
    if (task.volunteers.includes(data.userId)) return;

    task.volunteers.push(data.userId);
    task.currentPeople = task.volunteers.length;
    if (task.currentPeople > 0 && task.status === 'pending') {
      task.status = 'in_progress';
    }
    io.emit('task:update', tasks);
  });

  socket.on('task:progress', (data: { taskId: string; progress: Task['progress'] }) => {
    const task = tasks.find((t) => t.id === data.taskId);
    if (!task) return;
    task.progress = data.progress;
    if (data.progress === 'completed') {
      task.status = 'completed';
    }
    io.emit('task:update', tasks);
    io.emit('task:progressChanged', { taskId: data.taskId, progress: data.progress });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
