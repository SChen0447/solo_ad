import express from 'express';
import { registerRoutes, seedData } from './routes.js';

const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

registerRoutes(app);
seedData();

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
