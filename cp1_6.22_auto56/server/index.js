import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const trackConfigs = new Map();

app.post('/api/save', (req, res) => {
  const { config, trackType } = req.body;
  if (!config || !trackType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = uuidv4();
  const savedConfig = {
    id,
    trackType,
    config,
    createdAt: new Date().toISOString()
  };
  trackConfigs.set(id, savedConfig);
  res.json(savedConfig);
});

app.get('/api/load', (_req, res) => {
  const list = Array.from(trackConfigs.values());
  res.json(list);
});

app.get('/api/load/:id', (req, res) => {
  const config = trackConfigs.get(req.params.id);
  if (!config) {
    return res.status(404).json({ error: 'Track config not found' });
  }
  res.json(config);
});

app.listen(PORT, () => {
  console.log(`Track config server running on http://localhost:${PORT}`);
});
