import express from 'express';
import cors from 'cors';
import componentsRouter from './routes/components.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/components', componentsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '组件工坊服务运行正常' });
});

app.listen(PORT, () => {
  console.log(`组件工坊后端服务运行在 http://localhost:${PORT}`);
});
