import express from 'express';
import cors from 'cors';
import activitiesRouter from './routes/activities';
import preferencesRouter from './routes/preferences';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/activities', activitiesRouter);
app.use('/preferences', preferencesRouter);

app.listen(PORT, () => {
  console.log(`Conference Schedule API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
