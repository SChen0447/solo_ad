import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Tool, Task, User, IntegralRecord, TaskStatus } from './types';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const CURRENT_USER_ID = 'user-001';

const tools: Tool[] = [
  {
    id: uuidv4(),
    name: '电钻套装',
    description: '包含多种钻头，适用于墙面和木材钻孔',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20drill%20tool%20set%20on%20white%20background&image_size=square',
    ownerId: 'user-002',
    ownerNickname: '老张师傅',
    pricePerDay: 15,
    status: 'available',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: uuidv4(),
    name: '折叠梯子',
    description: '3米高折叠梯，适合换灯泡和高处作业',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=folding%20ladder%203%20meters%20on%20white%20background&image_size=square',
    ownerId: 'user-003',
    ownerNickname: '李阿姨',
    pricePerDay: 10,
    status: 'available',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: uuidv4(),
    name: '扳手工具组',
    description: '8-24mm套筒扳手组合，维修必备',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wrench%20tool%20set%20on%20white%20background&image_size=square',
    ownerId: 'user-004',
    ownerNickname: '小王',
    pricePerDay: 8,
    status: 'reserved',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: uuidv4(),
    name: '管道疏通器',
    description: '10米弹簧疏通器，解决下水道堵塞',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=plumbing%20snake%20drain%20auger%20on%20white%20background&image_size=square',
    ownerId: 'user-005',
    ownerNickname: '陈大爷',
    pricePerDay: 12,
    status: 'available',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: uuidv4(),
    name: '手推车',
    description: '重型折叠手推车，承重150kg',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=heavy%20duty%20folding%20hand%20truck%20on%20white%20background&image_size=square',
    ownerId: 'user-006',
    ownerNickname: '刘大哥',
    pricePerDay: 20,
    status: 'available',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: uuidv4(),
    name: '螺丝刀套装',
    description: '十字一字各规格，带磁性',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=screwdriver%20set%20magnetic%20on%20white%20background&image_size=square',
    ownerId: 'user-002',
    ownerNickname: '老张师傅',
    pricePerDay: 5,
    status: 'available',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

const tasks: Task[] = [
  {
    id: uuidv4(),
    title: '需帮忙搬沙发上楼',
    description: '新买的沙发需要从1楼搬到5楼，无电梯，约50kg',
    reward: 50,
    creatorId: 'user-007',
    creatorNickname: '周女士',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
    urgency: 'urgent',
    acceptedBy: [],
    maxAccepts: 2,
  },
  {
    id: uuidv4(),
    title: '厨房水龙头漏水维修',
    description: '水龙头滴水，需要更换密封圈，有配件',
    reward: 30,
    creatorId: 'user-008',
    creatorNickname: '吴先生',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'pending',
    urgency: 'normal',
    acceptedBy: ['user-002'],
    maxAccepts: 1,
  },
  {
    id: uuidv4(),
    title: '紧急！家里断电了',
    description: '客厅插座全部断电，配电箱在门外，急找电工帮忙',
    reward: 80,
    creatorId: 'user-009',
    creatorNickname: '郑奶奶',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    deadline: new Date(Date.now() + 3600000 * 4).toISOString(),
    status: 'pending',
    urgency: 'very-urgent',
    acceptedBy: [],
    maxAccepts: 1,
  },
  {
    id: uuidv4(),
    title: '组装宜家衣柜',
    description: '购买的宜家帕克思衣柜需要组装，有说明书',
    reward: 60,
    creatorId: 'user-010',
    creatorNickname: '小孙',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'in-progress',
    urgency: 'normal',
    acceptedBy: ['user-004', 'user-006'],
    maxAccepts: 2,
  },
  {
    id: uuidv4(),
    title: '帮老人去医院取药',
    description: '行动不便，需帮忙到社区医院取慢性病药物',
    reward: 25,
    creatorId: 'user-011',
    creatorNickname: '钱爷爷',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
    urgency: 'urgent',
    acceptedBy: [],
    maxAccepts: 1,
  },
  {
    id: uuidv4(),
    title: '安装窗帘杆',
    description: '卧室需要安装两根窗帘杆，墙面是混凝土',
    reward: 35,
    creatorId: 'user-012',
    creatorNickname: '冯小姐',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: 'pending',
    urgency: 'normal',
    acceptedBy: [],
    maxAccepts: 1,
  },
  {
    id: uuidv4(),
    title: '宠物临时照顾',
    description: '出差两天，需要照顾一只金毛犬，每天喂食遛狗',
    reward: 100,
    creatorId: 'user-013',
    creatorNickname: '蒋先生',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'completed',
    urgency: 'normal',
    acceptedBy: ['user-003'],
    maxAccepts: 1,
  },
];

const users: User[] = [
  {
    id: CURRENT_USER_ID,
    nickname: '我',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20avatar%20portrait%20warm%20colors&image_size=square',
    integral: 280,
    creditLevel: 3,
  },
  {
    id: 'user-002',
    nickname: '老张师傅',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=middle%20aged%20man%20avatar%20friendly&image_size=square',
    integral: 650,
    creditLevel: 5,
  },
  {
    id: 'user-003',
    nickname: '李阿姨',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=middle%20aged%20woman%20avatar%20kind&image_size=square',
    integral: 420,
    creditLevel: 4,
  },
];

const integralRecords: IntegralRecord[] = [
  {
    id: uuidv4(),
    userId: CURRENT_USER_ID,
    type: 'income',
    amount: 50,
    description: '完成帮忙搬家用任务',
    counterpartId: 'user-007',
    counterpartNickname: '周女士',
    counterpartAvatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20avatar%20professional&image_size=square',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: uuidv4(),
    userId: CURRENT_USER_ID,
    type: 'expense',
    amount: 15,
    description: '借用电钻套装1天',
    counterpartId: 'user-002',
    counterpartNickname: '老张师傅',
    counterpartAvatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=middle%20aged%20man%20avatar%20friendly&image_size=square',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: uuidv4(),
    userId: CURRENT_USER_ID,
    type: 'income',
    amount: 30,
    description: '完成换锁任务',
    counterpartId: 'user-008',
    counterpartNickname: '吴先生',
    counterpartAvatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=business%20man%20avatar%20professional&image_size=square',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: uuidv4(),
    userId: CURRENT_USER_ID,
    type: 'expense',
    amount: 20,
    description: '借用手推车2小时',
    counterpartId: 'user-006',
    counterpartNickname: '刘大哥',
    counterpartAvatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=strong%20man%20avatar%20friendly&image_size=square',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: uuidv4(),
    userId: CURRENT_USER_ID,
    type: 'income',
    amount: 100,
    description: '新用户注册奖励',
    counterpartId: 'system',
    counterpartNickname: '系统',
    counterpartAvatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=system%20badge%20icon%20blue&image_size=square',
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
];

app.get('/api/tools', (_req: Request, res: Response<Tool[]>) => {
  res.json(tools);
});

app.post('/api/tools', (req: Request<unknown, unknown, Omit<Tool, 'id' | 'createdAt'>>, res: Response<Tool>) => {
  const newTool: Tool = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  tools.unshift(newTool);
  res.json(newTool);
});

app.put('/api/tools/:id', (req: Request<{ id: string }, unknown, { status?: Tool['status'] }>, res: Response<Tool | { error: string }>) => {
  const tool = tools.find(t => t.id === req.params.id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  if (req.body.status) {
    tool.status = req.body.status;
  }
  res.json(tool);
});

app.get('/api/tasks', (_req: Request, res: Response<Task[]>) => {
  res.json(tasks);
});

app.post('/api/tasks', (req: Request<unknown, unknown, Omit<Task, 'id' | 'createdAt' | 'status' | 'acceptedBy'>>, res: Response<Task>) => {
  const newTask: Task = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    acceptedBy: [],
  };
  tasks.unshift(newTask);
  res.json(newTask);
});

app.post('/api/tasks/:id/accept', (req: Request<{ id: string }>, res: Response<Task | { error: string }>) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  if (task.status !== 'pending') {
    return res.status(400).json({ error: '任务状态不允许接单' });
  }
  if (task.acceptedBy.length >= task.maxAccepts) {
    return res.status(400).json({ error: '接单人数已满' });
  }
  if (task.acceptedBy.includes(CURRENT_USER_ID)) {
    return res.status(400).json({ error: '您已接单' });
  }
  
  task.acceptedBy.push(CURRENT_USER_ID);
  if (task.acceptedBy.length >= task.maxAccepts) {
    task.status = 'in-progress';
  }
  
  res.json(task);
});

app.put('/api/tasks/:id/status', (req: Request<{ id: string }, unknown, { status: TaskStatus }>, res: Response<Task | { error: string }>) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  task.status = req.body.status;
  
  if (req.body.status === 'completed') {
    const currentUser = users.find(u => u.id === CURRENT_USER_ID);
    if (currentUser) {
      currentUser.integral = Math.min(currentUser.integral + task.reward, 1000);
    }
  }
  
  res.json(task);
});

app.get('/api/user/integral', (_req: Request, res: Response<{ integral: number; maxIntegral: number }>) => {
  const user = users.find(u => u.id === CURRENT_USER_ID);
  res.json({
    integral: user?.integral ?? 0,
    maxIntegral: 1000,
  });
});

app.get('/api/user/records', (_req: Request, res: Response<IntegralRecord[]>) => {
  const userRecords = integralRecords
    .filter(r => r.userId === CURRENT_USER_ID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  res.json(userRecords);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
