import { Router, Request, Response } from 'express';
import { volunteers } from './users.js';

const router = Router();

export interface Activity {
  id: string;
  name: string;
  location: string;
  dateTime: string;
  maxParticipants: number;
  description: string;
  skillsRequired: string[];
  status: 'recruiting' | 'upcoming' | 'ended';
  registeredUsers: string[];
  checkedInUsers: string[];
  duration: number;
  createdAt: Date;
}

const activities: Map<string, Activity> = new Map();

function generateId(): string {
  return 'act' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

const today = new Date('2026-06-20');
const tomorrow = new Date(today.getTime() + 86400000);
const nextWeek = new Date(today.getTime() + 7 * 86400000);
const lastWeek = new Date(today.getTime() - 7 * 86400000);

const demoActivities: Activity[] = [
  {
    id: 'act1',
    name: '社区公园清洁行动',
    location: '中央公园东门',
    dateTime: today.toISOString().split('T')[0] + ' 09:00',
    maxParticipants: 20,
    description: '参与社区公园的清洁工作，包括捡拾垃圾、整理花坛、擦拭公共设施等。活动结束后提供简单午餐。',
    skillsRequired: [],
    status: 'recruiting',
    registeredUsers: ['v1', 'v3'],
    checkedInUsers: [],
    duration: 4,
    createdAt: new Date(),
  },
  {
    id: 'act2',
    name: '敬老院爱心陪伴',
    location: '阳光敬老院',
    dateTime: tomorrow.toISOString().split('T')[0] + ' 14:00',
    maxParticipants: 10,
    description: '为敬老院的老人们提供陪伴服务，包括聊天、读报、唱歌、简单的手工活动等。',
    skillsRequired: ['陪伴老人', '耐心'],
    status: 'recruiting',
    registeredUsers: ['v3'],
    checkedInUsers: [],
    duration: 3,
    createdAt: new Date(),
  },
  {
    id: 'act3',
    name: '儿童课外辅导',
    location: '社区活动中心',
    dateTime: nextWeek.toISOString().split('T')[0] + ' 15:00',
    maxParticipants: 8,
    description: '为社区内的小学生提供课外作业辅导和兴趣培养，包括数学、语文、绘画等。',
    skillsRequired: ['教学', '耐心'],
    status: 'upcoming',
    registeredUsers: [],
    checkedInUsers: [],
    duration: 2,
    createdAt: new Date(),
  },
  {
    id: 'act4',
    name: '社区急救知识培训',
    location: '社区卫生服务站',
    dateTime: nextWeek.toISOString().split('T')[0] + ' 10:00',
    maxParticipants: 15,
    description: '专业医护人员讲解心肺复苏、止血包扎等急救技能，培训合格颁发证书。',
    skillsRequired: ['医疗护理'],
    status: 'upcoming',
    registeredUsers: ['v2'],
    checkedInUsers: [],
    duration: 3,
    createdAt: new Date(),
  },
  {
    id: 'act0',
    name: '社区清洁日（已结束）',
    location: '主街道沿线',
    dateTime: lastWeek.toISOString().split('T')[0] + ' 08:30',
    maxParticipants: 30,
    description: '对社区主街道进行大扫除，美化环境。',
    skillsRequired: [],
    status: 'ended',
    registeredUsers: ['v1', 'v2', 'v3'],
    checkedInUsers: ['v1', 'v2', 'v3'],
    duration: 4,
    createdAt: new Date(),
  },
];

demoActivities.forEach(a => activities.set(a.id, a));

function updateActivityStatus(activity: Activity): string {
  const now = new Date('2026-06-20T12:00:00');
  const actDate = new Date(activity.dateTime.replace(' ', 'T'));
  const diffDays = (actDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diffDays < 0) return 'ended';
  if (diffDays <= 2) return 'upcoming';
  return 'recruiting';
}

router.post('/', (req: Request, res: Response) => {
  const { name, location, dateTime, maxParticipants, description, skillsRequired, duration } = req.body;

  if (!name || !location || !dateTime || !maxParticipants) {
    return res.status(400).json({ error: '请填写必填字段' });
  }

  const id = generateId();
  const activity: Activity = {
    id,
    name,
    location,
    dateTime,
    maxParticipants,
    description: description || '',
    skillsRequired: skillsRequired || [],
    status: 'recruiting',
    registeredUsers: [],
    checkedInUsers: [],
    duration: duration || 2,
    createdAt: new Date(),
  };

  activities.set(id, activity);
  res.json({ success: true, activity });
});

router.get('/', (req: Request, res: Response) => {
  const list = Array.from(activities.values())
    .map(a => ({
      ...a,
      status: updateActivityStatus(a),
      registeredCount: a.registeredUsers.length,
    }))
    .sort((a, b) => {
      const order = { recruiting: 0, upcoming: 1, ended: 2 };
      return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    });
  
  res.json(list);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const activity = activities.get(id);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const registeredVolunteers = activity.registeredUsers.map(uid => {
    const v = volunteers.get(uid);
    return v ? { id: v.id, nickname: v.nickname, avatar: v.avatar } : null;
  }).filter(Boolean);

  res.json({
    ...activity,
    status: updateActivityStatus(activity),
    registeredCount: activity.registeredUsers.length,
    registeredVolunteers,
  });
});

router.post('/:id/register', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  const activity = activities.get(id);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  activity.status = updateActivityStatus(activity);
  if (activity.status === 'ended') {
    return res.status(400).json({ error: '活动已结束' });
  }

  if (activity.registeredUsers.includes(userId)) {
    return res.status(400).json({ error: '您已报名该活动' });
  }

  if (activity.registeredUsers.length >= activity.maxParticipants) {
    return res.status(400).json({ error: '报名人数已满' });
  }

  activity.registeredUsers.push(userId);
  activities.set(id, activity);

  res.json({
    success: true,
    registered: true,
    registeredCount: activity.registeredUsers.length,
  });
});

router.post('/:id/checkin', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  const activity = activities.get(id);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  activity.status = updateActivityStatus(activity);
  if (activity.status === 'ended') {
    return res.status(400).json({ error: '活动已结束' });
  }

  if (!activity.registeredUsers.includes(userId)) {
    return res.status(400).json({ error: '请先报名该活动' });
  }

  if (activity.checkedInUsers.includes(userId)) {
    return res.status(400).json({ error: '您已签到' });
  }

  activity.checkedInUsers.push(userId);
  activities.set(id, activity);

  res.json({
    success: true,
    checkedIn: true,
    duration: activity.duration,
    date: activity.dateTime.split(' ')[0],
    name: activity.name,
  });
});

export default router;
export { activities };
