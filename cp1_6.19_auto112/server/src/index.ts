import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '../data');
const PLANTS_FILE = path.join(DATA_DIR, 'plants.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

function readJSON(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data || '[]');
}

function writeJSON(filePath: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

app.get('/api/plants', (_req, res) => {
  try {
    const plants = readJSON(PLANTS_FILE);
    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: '读取植物数据失败' });
  }
});

app.get('/api/plants/:id', (req, res) => {
  try {
    const plants = readJSON(PLANTS_FILE);
    const plant = plants.find((p: { id: string }) => p.id === req.params.id);
    if (!plant) {
      res.status(404).json({ error: '植物未找到' });
      return;
    }
    res.json(plant);
  } catch (error) {
    res.status(500).json({ error: '读取植物数据失败' });
  }
});

app.post('/api/plants', (req, res) => {
  try {
    const plants = readJSON(PLANTS_FILE);
    const newPlant = {
      id: generateId(),
      ...req.body,
      createdAt: new Date().toISOString(),
      nextWateringDate: new Date(Date.now() + req.body.wateringFrequency * 24 * 60 * 60 * 1000).toISOString()
    };
    plants.push(newPlant);
    writeJSON(PLANTS_FILE, plants);
    res.status(201).json(newPlant);
  } catch (error) {
    res.status(500).json({ error: '创建植物失败' });
  }
});

app.put('/api/plants/:id', (req, res) => {
  try {
    const plants = readJSON(PLANTS_FILE);
    const index = plants.findIndex((p: { id: string }) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '植物未找到' });
      return;
    }
    const updatedPlant = { ...plants[index], ...req.body };
    plants[index] = updatedPlant;
    writeJSON(PLANTS_FILE, plants);
    res.json(updatedPlant);
  } catch (error) {
    res.status(500).json({ error: '更新植物失败' });
  }
});

app.delete('/api/plants/:id', (req, res) => {
  try {
    const plants = readJSON(PLANTS_FILE);
    const filtered = plants.filter((p: { id: string }) => p.id !== req.params.id);
    if (filtered.length === plants.length) {
      res.status(404).json({ error: '植物未找到' });
      return;
    }
    writeJSON(PLANTS_FILE, filtered);

    const logs = readJSON(LOGS_FILE);
    const filteredLogs = logs.filter((l: { plantId: string }) => l.plantId !== req.params.id);
    writeJSON(LOGS_FILE, filteredLogs);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除植物失败' });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const logs = readJSON(LOGS_FILE);
    const plantId = req.query.plantId as string;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    let filtered = plantId ? logs.filter((l: { plantId: string }) => l.plantId === plantId) : logs;
    filtered.sort((a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const paginated = filtered.slice(skip, skip + limit);
    res.json({ logs: paginated, total: filtered.length });
  } catch (error) {
    res.status(500).json({ error: '读取日志失败' });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const logs = readJSON(LOGS_FILE);
    const newLog = {
      id: generateId(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    logs.push(newLog);
    writeJSON(LOGS_FILE, logs);

    if (req.body.type === 'water') {
      const plants = readJSON(PLANTS_FILE);
      const index = plants.findIndex((p: { id: string }) => p.id === req.body.plantId);
      if (index !== -1) {
        plants[index].nextWateringDate = new Date(
          Date.now() + plants[index].wateringFrequency * 24 * 60 * 60 * 1000
        ).toISOString();
        writeJSON(PLANTS_FILE, plants);
      }
    }

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: '创建日志失败' });
  }
});

app.put('/api/logs/:id', (req, res) => {
  try {
    const logs = readJSON(LOGS_FILE);
    const index = logs.findIndex((l: { id: string }) => l.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '日志未找到' });
      return;
    }
    logs[index] = { ...logs[index], ...req.body };
    writeJSON(LOGS_FILE, logs);
    res.json(logs[index]);
  } catch (error) {
    res.status(500).json({ error: '更新日志失败' });
  }
});

app.delete('/api/logs/:id', (req, res) => {
  try {
    const logs = readJSON(LOGS_FILE);
    const filtered = logs.filter((l: { id: string }) => l.id !== req.params.id);
    if (filtered.length === logs.length) {
      res.status(404).json({ error: '日志未找到' });
      return;
    }
    writeJSON(LOGS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除日志失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🌱 Plant Tracker API 运行在 http://localhost:${PORT}`);
});
