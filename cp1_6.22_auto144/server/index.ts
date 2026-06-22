import express from 'express';
import cors from 'cors';
import recruitmentRouter from './modules/recruitment';
import portfolioRouter from './modules/portfolio';
import applicationsRouter from './modules/applications';
import adminRouter from './modules/admin';
import { users } from './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/recruitment', recruitmentRouter);
app.use('/api/portfolios', portfolioRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/admin', adminRouter);

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' });
  }
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ user, token: 'mock-jwt-token-' + user.id });
});

app.post('/api/auth/register', (req, res) => {
  const { email, name, nickname } = req.body;
  if (!email || !name || !nickname) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }
  const newUser = {
    id: 'user-' + Date.now(),
    email,
    name,
    nickname,
    role: 'student' as const,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  res.status(201).json({ user: newUser, token: 'mock-jwt-token-' + newUser.id });
});

app.get('/api/user/current', (_req, res) => {
  res.json({ user: users[0] });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
