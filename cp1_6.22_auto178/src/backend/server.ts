import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import recipesRouter from './routes/recipes';
import ingredientsRouter from './routes/ingredients';
import {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  JWT_SECRET,
} from './store';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }
  if (findUserByEmail(email)) {
    return res.status(400).json({ error: '邮箱已被注册' });
  }
  if (findUserByUsername(username)) {
    return res.status(400).json({ error: '用户名已被使用' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser(username, email, passwordHash);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      pantry: user.pantry,
      savedRecipes: user.savedRecipes,
    });
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
});

app.use('/api/recipes', recipesRouter);
app.use('/api/ingredients', ingredientsRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
