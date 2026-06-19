import express from 'express';
import cors from 'cors';
import taskRoutes from './routes/tasks';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', taskRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
