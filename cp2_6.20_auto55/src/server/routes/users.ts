import { Router, Request, Response } from 'express';

const router = Router();

export interface Volunteer {
  id: string;
  nickname: string;
  email: string;
  password: string;
  skills: string[];
  availableSlots: string[];
  avatar: string;
  totalHours: number;
  authLevel: number;
  registeredActivities: string[];
  servedActivities: ServedActivity[];
  badges: number[];
  isAdmin: boolean;
  createdAt: Date;
}

export interface ServedActivity {
  activityId: string;
  activityName: string;
  hours: number;
  date: string;
  checkedIn: boolean;
}

const volunteers: Map<string, Volunteer> = new Map();

const COLORS = [
  '#22C55E', '#84CC16', '#EAB308', '#F59E0B', '#F97316',
  '#EF4444', '#EC4899', '#A855F7', '#8B5CF6'
];

function getRandomColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

volunteers.set('admin', {
  id: 'admin',
  nickname: '管理员',
  email: 'admin@example.com',
  password: 'admin123',
  skills: ['管理'],
  availableSlots: ['全天'],
  avatar: '👨‍💼',
  totalHours: 120,
  authLevel: 4,
  registeredActivities: [],
  servedActivities: [],
  badges: [10, 50, 100],
  isAdmin: true,
  createdAt: new Date(),
});

const demoVolunteers: Volunteer[] = [
  {
    id: 'v1',
    nickname: '热心小王',
    email: 'wang@example.com',
    password: '123456',
    skills: ['教学', '陪伴老人'],
    availableSlots: ['周末上午', '周末下午'],
    avatar: '👦',
    totalHours: 85,
    authLevel: 3,
    registeredActivities: ['act1'],
    servedActivities: [
      { activityId: 'act0', activityName: '社区清洁日', hours: 4, date: '2026-05-15', checkedIn: true },
      { activityId: 'act00', activityName: '敬老院慰问', hours: 6, date: '2026-05-08', checkedIn: true },
    ],
    badges: [10, 50],
    isAdmin: false,
    createdAt: new Date(),
  },
  {
    id: 'v2',
    nickname: '阳光小李',
    email: 'li@example.com',
    password: '123456',
    skills: ['医疗护理', '急救'],
    availableSlots: ['工作日晚上', '周末全天'],
    avatar: '👩',
    totalHours: 62,
    authLevel: 2,
    registeredActivities: [],
    servedActivities: [
      { activityId: 'act0', activityName: '社区清洁日', hours: 3, date: '2026-05-15', checkedIn: true },
    ],
    badges: [10, 50],
    isAdmin: false,
    createdAt: new Date(),
  },
  {
    id: 'v3',
    nickname: '爱心老张',
    email: 'zhang@example.com',
    password: '123456',
    skills: ['维修', '搬运'],
    availableSlots: ['工作日全天'],
    avatar: '👨',
    totalHours: 156,
    authLevel: 4,
    registeredActivities: ['act1', 'act2'],
    servedActivities: [
      { activityId: 'act0', activityName: '社区清洁日', hours: 5, date: '2026-05-15', checkedIn: true },
      { activityId: 'act00', activityName: '敬老院慰问', hours: 8, date: '2026-05-08', checkedIn: true },
      { activityId: 'act000', activityName: '儿童辅导', hours: 10, date: '2026-04-20', checkedIn: true },
    ],
    badges: [10, 50, 100],
    isAdmin: false,
    createdAt: new Date(),
  },
];

demoVolunteers.forEach(v => volunteers.set(v.id, v));

router.post('/register', (req: Request, res: Response) => {
  const { nickname, email, password, skills, availableSlots } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({ error: '请填写必填字段' });
  }

  const emailExists = Array.from(volunteers.values()).some(v => v.email === email);
  if (emailExists) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }

  const id = generateId();
  const avatar = ['😊', '🌟', '💪', '🎯', '❤️', '🌈', '⭐', '🎉'][Math.floor(Math.random() * 8)];
  
  const volunteer: Volunteer = {
    id,
    nickname,
    email,
    password,
    skills: skills || [],
    availableSlots: availableSlots || [],
    avatar,
    totalHours: 0,
    authLevel: 1,
    registeredActivities: [],
    servedActivities: [],
    badges: [],
    isAdmin: false,
    createdAt: new Date(),
  };

  volunteers.set(id, volunteer);
  const { password: _, ...userWithoutPassword } = volunteer;
  res.json({ success: true, user: userWithoutPassword });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const volunteer = Array.from(volunteers.values()).find(v => v.email === email);
  if (!volunteer) {
    return res.status(401).json({ error: '用户不存在' });
  }

  if (volunteer.password !== password) {
    return res.status(401).json({ error: '密码错误' });
  }

  const { password: _, ...userWithoutPassword } = volunteer;
  res.json({ success: true, user: userWithoutPassword });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const volunteer = volunteers.get(id);

  if (!volunteer) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { password: _, ...userWithoutPassword } = volunteer;
  res.json(userWithoutPassword);
});

router.get('/ranking/list', (req: Request, res: Response) => {
  const ranked = Array.from(volunteers.values())
    .filter(v => !v.isAdmin)
    .sort((a, b) => b.totalHours - a.totalHours)
    .map((v, index) => ({
      rank: index + 1,
      id: v.id,
      nickname: v.nickname,
      avatar: v.avatar,
      totalHours: v.totalHours,
      skills: v.skills,
      authLevel: v.authLevel,
      badges: v.badges,
    }));

  res.json(ranked);
});

router.patch('/:id/activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const volunteer = volunteers.get(id);

  if (!volunteer) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { activityId, activityName, hours, date, action } = req.body;

  if (action === 'register') {
    if (volunteer.registeredActivities.includes(activityId)) {
      return res.status(400).json({ error: '已报名该活动' });
    }
    volunteer.registeredActivities.push(activityId);
  } else if (action === 'checkin') {
    const served: ServedActivity = {
      activityId,
      activityName,
      hours: hours || 2,
      date: date || new Date().toISOString().split('T')[0],
      checkedIn: true,
    };
    volunteer.servedActivities.push(served);
    volunteer.totalHours += served.hours;
    volunteer.registeredActivities = volunteer.registeredActivities.filter(a => a !== activityId);
    
    if (volunteer.totalHours >= 10 && !volunteer.badges.includes(10)) volunteer.badges.push(10);
    if (volunteer.totalHours >= 50 && !volunteer.badges.includes(50)) volunteer.badges.push(50);
    if (volunteer.totalHours >= 100 && !volunteer.badges.includes(100)) volunteer.badges.push(100);
    
    volunteer.authLevel = Math.min(5, Math.floor(volunteer.totalHours / 25) + 1);
  }

  volunteers.set(id, volunteer);
  const { password: _, ...userWithoutPassword } = volunteer;
  res.json({ success: true, user: userWithoutPassword, newBadges: volunteer.badges });
});

export default router;
export { volunteers };
