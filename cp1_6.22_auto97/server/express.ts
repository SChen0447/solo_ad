import express from 'express';
import cors from 'cors';
import tasksRouter from './routes/tasks';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.use('/api', tasksRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Agile Board API running at http://localhost:${PORT}`);
});
