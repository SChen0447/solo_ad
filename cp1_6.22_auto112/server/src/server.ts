import express from 'express';
import cors from 'cors';
import routesRouter from './routes/routes';
import reviewsRouter from './routes/reviews';
import { initializeData } from './data/store';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/routes', routesRouter);
app.use('/api/routes/:id/reviews', reviewsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

initializeData();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/routes`);
  console.log(`  GET  /api/routes/:id`);
  console.log(`  POST /api/routes`);
  console.log(`  GET  /api/routes/:id/reviews`);
  console.log(`  POST /api/routes/:id/reviews`);
});

export default app;
