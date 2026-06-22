import type { Request, Response } from 'express';
import { users, tokens, generateToken, randomDelay } from './store';

export const register = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  if (users.find((u) => u.username === username)) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }

  const token = generateToken();
  const user = { username, password, token };
  users.push(user);
  tokens.set(token, username);

  res.json({ token, username });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  await randomDelay();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = generateToken();
  user.token = token;
  tokens.set(token, username);

  res.json({ token, username });
};

export const authMiddleware = (req: Request, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !tokens.has(token)) {
    res.status(401).json({ error: '未授权访问' });
    return;
  }

  (req as Request & { username: string }).username = tokens.get(token)!;
  next();
};
