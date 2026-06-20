import { Router, Request, Response } from 'express';
import { users, BADGES, generateId, User } from '../types';

const router = Router();

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: User;
  }
}

router.post('/register', (req: Request, res: Response) => {
  const { nickname, email, password, skills, availableTime } = req.body;

  if (!nickname || !email || !password) {
    return res.status(400).json({ success: false, message: '请填写必填字段' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ success: false, message: '该邮箱已被注册' });
  }

  const newUser: User = {
    id: generateId(),
    nickname,
    email,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
    skills: skills || [],
    availableTime: availableTime || '',
    totalHours: 0,
    authLevel: 1,
    badges: [],
    registeredActivities: [],
    serviceHistory: [],
    isAdmin: false,
  };

  users.push(newUser);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ success: true, data: userWithoutPassword });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

router.get('/profile', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

router.get('/ranking', (req: Request, res: Response) => {
  const sortedUsers = [...users]
    .filter(u => !u.isAdmin)
    .sort((a, b) => b.totalHours - a.totalHours)
    .map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      totalHours: u.totalHours,
      authLevel: u.authLevel,
      badges: u.badges,
    }));

  res.json({ success: true, data: sortedUsers });
});

router.post('/check-badges', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const newBadges: typeof BADGES = [];
  BADGES.forEach(badge => {
    if (user.totalHours >= badge.hours && !user.badges.includes(badge.hours)) {
      user.badges.push(badge.hours);
      newBadges.push(badge);
    }
  });

  user.authLevel = Math.min(5, Math.floor(user.totalHours / 20) + 1);

  res.json({ success: true, data: { newBadges, totalHours: user.totalHours, authLevel: user.authLevel } });
});

export default router;
