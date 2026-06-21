import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, '../src/data');

app.get('/api/buildings', (req, res) => {
  const era = parseInt(req.query.era as string) || 0;
  try {
    const rawData = fs.readFileSync(path.join(dataPath, 'buildingData.json'), 'utf-8');
    const allBuildings = JSON.parse(rawData);
    const filtered = allBuildings.filter((b: { era: number }) => b.era === era);
    res.json(filtered);
  } catch (error) {
    console.error('Error reading building data:', error);
    res.status(500).json({ error: 'Failed to load building data' });
  }
});

app.get('/api/events', (_req, res) => {
  try {
    const rawData = fs.readFileSync(path.join(dataPath, 'historyEvents.json'), 'utf-8');
    const events = JSON.parse(rawData);
    res.json(events);
  } catch (error) {
    console.error('Error reading events data:', error);
    res.status(500).json({ error: 'Failed to load events data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
