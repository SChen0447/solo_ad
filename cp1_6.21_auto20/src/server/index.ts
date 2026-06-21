import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

type ActivityCategory = '景点' | '餐厅' | '交通' | '住宿' | '门票' | '其他';
type BudgetCategory = '住宿' | '餐饮' | '交通' | '门票' | '其他';

interface Member {
  id: string;
  name: string;
  color: string;
}

interface Activity {
  id: string;
  dayIndex: number;
  title: string;
  address: string;
  budget: number;
  category: ActivityCategory;
  budgetCategory: BudgetCategory;
  notes: string;
  images: string[];
  payerId: string | null;
  order: number;
}

interface FileItem {
  id: string;
  planId: string;
  name: string;
  type: 'image' | 'pdf' | 'note';
  url: string;
  uploaderId: string;
  uploaderName: string;
  uploadedAt: Date;
  size: number;
}

interface TravelPlan {
  id: string;
  shareCode: string;
  title: string;
  description: string;
  startDate: string;
  days: number;
  members: Member[];
  activities: Activity[];
  files: FileItem[];
  createdAt: Date;
}

const plans: Map<string, TravelPlan> = new Map();

const memberColors = ['#4DB6AC', '#42A5F5', '#FF7043', '#AB47BC', '#FFCA28', '#66BB6A', '#EF5350', '#26C6DA'];

function getCategoryBudget(cat: ActivityCategory): BudgetCategory {
  const map: Record<ActivityCategory, BudgetCategory> = {
    '景点': '门票',
    '餐厅': '餐饮',
    '交通': '交通',
    '住宿': '住宿',
    '门票': '门票',
    '其他': '其他',
  };
  return map[cat];
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/plans', (req: Request, res: Response) => {
  const { title, description, startDate, days, memberName } = req.body;
  const planId = uuidv4();
  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const memberId = uuidv4();

  const plan: TravelPlan = {
    id: planId,
    shareCode,
    title: title || '我的旅行',
    description: description || '',
    startDate: startDate || new Date().toISOString().split('T')[0],
    days: days || 3,
    members: [{
      id: memberId,
      name: memberName || '旅行者',
      color: memberColors[0],
    }],
    activities: [],
    files: [],
    createdAt: new Date(),
  };

  plans.set(planId, plan);
  res.json({ plan, memberId });
});

app.post('/api/plans/:shareCode/join', (req: Request, res: Response) => {
  const { shareCode } = req.params;
  const { memberName } = req.body;

  const plan = Array.from(plans.values()).find(p => p.shareCode === shareCode);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const memberId = uuidv4();
  const colorIndex = plan.members.length % memberColors.length;
  plan.members.push({
    id: memberId,
    name: memberName || '旅行者',
    color: memberColors[colorIndex],
  });

  io.to(plan.id).emit('plan:updated', plan);
  res.json({ plan, memberId });
});

app.get('/api/plans/:planId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }
  res.json(plan);
});

app.post('/api/plans/:planId/activities', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const { dayIndex, title, address, budget, category, notes } = req.body;
  const activity: Activity = {
    id: uuidv4(),
    dayIndex: dayIndex ?? 0,
    title: title || '新活动',
    address: address || '',
    budget: budget || 0,
    category: category || '其他',
    budgetCategory: getCategoryBudget(category || '其他'),
    notes: notes || '',
    images: [],
    payerId: null,
    order: plan.activities.filter(a => a.dayIndex === (dayIndex ?? 0)).length,
  };

  plan.activities.push(activity);
  io.to(plan.id).emit('plan:updated', plan);
  res.json(activity);
});

app.put('/api/plans/:planId/activities/:activityId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const activity = plan.activities.find(a => a.id === req.params.activityId);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const { title, address, budget, category, notes, payerId, order } = req.body;
  if (title !== undefined) activity.title = title;
  if (address !== undefined) activity.address = address;
  if (budget !== undefined) activity.budget = budget;
  if (category !== undefined) {
    activity.category = category;
    activity.budgetCategory = getCategoryBudget(category);
  }
  if (notes !== undefined) activity.notes = notes;
  if (payerId !== undefined) activity.payerId = payerId;
  if (order !== undefined) activity.order = order;

  io.to(plan.id).emit('plan:updated', plan);
  res.json(activity);
});

app.delete('/api/plans/:planId/activities/:activityId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  plan.activities = plan.activities.filter(a => a.id !== req.params.activityId);
  io.to(plan.id).emit('plan:updated', plan);
  res.json({ success: true });
});

app.post('/api/plans/:planId/activities/reorder', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const { reorderedIds, dayIndex } = req.body;
  reorderedIds.forEach((id: string, idx: number) => {
    const activity = plan.activities.find(a => a.id === id);
    if (activity) {
      activity.order = idx;
      activity.dayIndex = dayIndex;
    }
  });

  io.to(plan.id).emit('plan:updated', plan);
  res.json({ success: true });
});

app.post('/api/plans/:planId/upload', upload.single('file'), (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  let type: FileItem['type'] = 'note';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    type = 'image';
  } else if (ext === '.pdf') {
    type = 'pdf';
  }

  const fileItem: FileItem = {
    id: uuidv4(),
    planId: plan.id,
    name: req.file.originalname,
    type,
    url: `/uploads/${req.file.filename}`,
    uploaderId: req.body.uploaderId || '',
    uploaderName: req.body.uploaderName || '匿名',
    uploadedAt: new Date(),
    size: req.file.size,
  };

  plan.files.push(fileItem);
  io.to(plan.id).emit('plan:updated', plan);
  res.json(fileItem);
});

app.delete('/api/plans/:planId/files/:fileId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const file = plan.files.find(f => f.id === req.params.fileId);
  if (file) {
    const filePath = path.join(__dirname, '../..', file.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    plan.files = plan.files.filter(f => f.id !== req.params.fileId);
  }

  io.to(plan.id).emit('plan:updated', plan);
  res.json({ success: true });
});

app.get('/api/plans/:planId/budget', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: '计划不存在' });
  }

  const byCategory: Record<string, number> = {
    '住宿': 0, '餐饮': 0, '交通': 0, '门票': 0, '其他': 0,
  };
  const byDay: Record<number, number> = {};
  const byPayer: Record<string, { name: string; color: string; total: number }> = {};

  plan.activities.forEach(act => {
    byCategory[act.budgetCategory] = (byCategory[act.budgetCategory] || 0) + act.budget;
    byDay[act.dayIndex] = (byDay[act.dayIndex] || 0) + act.budget;
    if (act.payerId) {
      const member = plan.members.find(m => m.id === act.payerId);
      if (member) {
        if (!byPayer[act.payerId]) {
          byPayer[act.payerId] = { name: member.name, color: member.color, total: 0 };
        }
        byPayer[act.payerId].total += act.budget;
      }
    }
  });

  const totalBudget = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const memberCount = plan.members.length || 1;
  const perPerson = totalBudget / memberCount;

  const settlements = plan.members.map(m => {
    const paid = byPayer[m.id]?.total || 0;
    return {
      memberId: m.id,
      name: m.name,
      color: m.color,
      paid,
      shouldPay: perPerson,
      balance: paid - perPerson,
    };
  });

  res.json({
    byCategory,
    byDay,
    byPayer,
    totalBudget,
    perPerson,
    settlements,
  });
});

io.on('connection', (socket: Socket) => {
  socket.on('plan:join', (planId: string) => {
    socket.join(planId);
  });

  socket.on('plan:leave', (planId: string) => {
    socket.leave(planId);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
