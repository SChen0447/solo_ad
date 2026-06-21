import { Router, type Request, type Response } from 'express';
import { findUserByUsername, createUser } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/register', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    return;
  }
  const result = createUser(username, password);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }
  const token = uuidv4();
  res.json({
    success: true,
    token,
    user: { id: result.user!.id, username: result.user!.username },
  });
});

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    return;
  }
  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
    return;
  }
  const token = uuidv4();
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username },
  });
});

export default router;
