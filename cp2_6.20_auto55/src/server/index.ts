import express from 'express';
import usersRouter from './routes/users.js';
import activitiesRouter from './routes/activities.js';

const app = express();
const PORT = 3001;

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '志愿者社区服务运行中' });
});

app.use('/api/users', usersRouter);
app.use('/api/activities', activitiesRouter);

app.listen(PORT, () => {
  console.log(`🚀 后端服务启动: http://localhost:${PORT}`);
});
