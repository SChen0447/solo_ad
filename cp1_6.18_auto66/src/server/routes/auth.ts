import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware/auth.js';
import { User } from '../types.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const existingUser = db.data.users.find(
    u => u.email === email || u.username === username
  );

  if (existingUser) {
    return res.status(400).json({ error: '用户名或邮箱已存在' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    createdAt: new Date().toISOString(),
    creditScore: 5,
    reviewCount: 0
  };

  db.data.users.push(newUser);
  await db.write();

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
      creditScore: newUser.creditScore
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }

  const user = db.data.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
      creditScore: user.creditScore,
      reviewCount: user.reviewCount
    }
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = db.data.users.find(u => u.id === req.userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const userReviews = db.data.reviews.filter(r => r.targetId === user.id && (r.type === 'buyer' || r.type === 'seller'));
  const avgRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 5;

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
    creditScore: avgRating.toFixed(1),
    reviewCount: userReviews.length
  });
});

router.get('/:id', async (req, res) => {
  const user = db.data.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const userReviews = db.data.reviews.filter(r => r.targetId === user.id && (r.type === 'buyer' || r.type === 'seller'));
  const avgRating = userReviews.length > 0
    ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
    : 5;

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt,
    creditScore: avgRating.toFixed(1),
    reviewCount: userReviews.length
  });
});

export default router;
