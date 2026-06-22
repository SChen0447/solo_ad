import express from 'express';
import cors from 'cors';
import garageRouter from './garage/garageRouter';
import trackRouter from './track/trackRouter';
import strategyRouter from './strategy/strategyRouter';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/garage', garageRouter);
app.use('/api/track', trackRouter);
app.use('/api/strategy', strategyRouter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Racing Garage API is running' });
});

app.listen(PORT, () => {
  console.log(`Racing Garage server running on http://localhost:${PORT}`);
});
