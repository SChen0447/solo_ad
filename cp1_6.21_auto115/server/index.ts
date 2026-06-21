import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { BrewRecord } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

const readData = (): BrewRecord[] => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data) as BrewRecord[];
};

const writeData = (data: BrewRecord[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/records', (_req, res) => {
  const records = readData();
  res.json(records);
});

app.post('/api/records', (req, res) => {
  const records = readData();
  const newRecord: BrewRecord = {
    id: uuidv4(),
    recordNumber: records.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  records.push(newRecord);
  writeData(records);
  res.json(newRecord);
});

app.put('/api/records/:id', (req, res) => {
  const records = readData();
  const index = records.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  records[index] = { ...records[index], ...req.body };
  writeData(records);
  res.json(records[index]);
});

app.delete('/api/records/:id', (req, res) => {
  let records = readData();
  records = records.filter((r) => r.id !== req.params.id);
  writeData(records);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
