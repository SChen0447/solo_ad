import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dataDir = join(__dirname, 'src', 'data');

const readJSON = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(join(dataDir, filename), 'utf-8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
};

app.get('/api/map', async (req, res) => {
  try {
    const mapData = await readJSON('mapData.json');
    res.json(mapData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

app.get('/api/cards', async (req, res) => {
  try {
    const cardData = await readJSON('cardData.json');
    res.json(cardData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load card data' });
  }
});

app.get('/api/monsters', async (req, res) => {
  try {
    const monsterData = await readJSON('monsterData.json');
    res.json(monsterData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load monster data' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
