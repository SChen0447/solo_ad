import { Router, Request, Response } from 'express';
import {
  users,
  registrations,
  serviceRecords,
  activities,
  getNextUserId,
  generateId,
  User,
} from '../data';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { nickname, email, password, skills, availableTime } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({ error: '请填写必填项' });
  }

  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }

  const newUser: User = {
    id: generateId('user', getNextUserId()),
    nickname,
    email,
    password,
    skills: skills || [],
    availableTime: availableTime || '',
    avatar: '',
    totalHours: 0,
    certificationLevel: 0,
    isAdmin: false,
    registeredAt: new Date().toISOString(),
  };

  users.push(newUser);

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.get('/:id', (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.get('/:id/registrations', (req: Request, res: Response) => {
  const userId = req.params.id;
  const userRegs = registrations.filter((r) => r.userId === userId);

  const result = userRegs.map((reg) => {
    const activity = activities.find((a) => a.id === reg.activityId);
    return {
      ...reg,
      activityName: activity?.name || '',
      activityLocation: activity?.location || '',
      activityDateTime: activity?.dateTime || '',
      activityStatus: activity?.status || '',
    };
  });

  res.json(result);
});

router.get('/:id/service-records', (req: Request, res: Response) => {
  const userId = req.params.id;
  const records = serviceRecords.filter((r) => r.userId === userId);

  const result = records.map((record) => {
    const activity = activities.find((a) => a.id === record.activityId);
    return {
      ...record,
      activityName: activity?.name || '',
    };
  });

  res.json(result);
});

router.get('/ranking/list', (_req: Request, res: Response) => {
  const sortedUsers = [...users]
    .filter((u) => !u.isAdmin)
    .sort((a, b) => b.totalHours - a.totalHours);

  const result = sortedUsers.map((user, index) => ({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    totalHours: user.totalHours,
    certificationLevel: user.certificationLevel,
    rank: index + 1,
  }));

  res.json(result);
});

router.put('/:id', (req: Request, res: Response) => {
  const userId = req.params.id;
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { nickname, skills, availableTime } = req.body;
  if (nickname !== undefined) users[userIndex].nickname = nickname;
  if (skills !== undefined) users[userIndex].skills = skills;
  if (availableTime !== undefined) users[userIndex].availableTime = availableTime;

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

export default router;
