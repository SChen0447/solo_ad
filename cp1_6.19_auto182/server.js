import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'src', 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const TIPS_FILE = path.join(DATA_DIR, 'tips.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing file:', err);
    return false;
  }
};

const generateNutrition = () => {
  const calories = Math.floor(Math.random() * 500) + 200;
  const protein = Math.floor(Math.random() * 40) + 5;
  const carbs = Math.floor(Math.random() * 60) + 10;
  const fat = Math.floor(Math.random() * 30) + 5;
  const balanceScore = Math.floor(Math.random() * 60) + 30;
  return { calories, protein, carbs, fat, balanceScore };
};

const getWeekDates = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }
  return weekDates;
};

app.get('/api/records', (req, res) => {
  const data = readJsonFile(RECORDS_FILE);
  if (!data) {
    return res.status(500).json({ error: 'Failed to read records' });
  }
  res.json(data.records || []);
});

app.post('/api/records', (req, res) => {
  const data = readJsonFile(RECORDS_FILE);
  if (!data) {
    return res.status(500).json({ error: 'Failed to read records' });
  }

  const newRecord = {
    id: uuidv4(),
    ...req.body,
    nutrition: generateNutrition(),
    createdAt: new Date().toISOString(),
  };

  data.records = data.records || [];
  data.records.push(newRecord);

  if (writeJsonFile(RECORDS_FILE, data)) {
    res.json(newRecord);
  } else {
    res.status(500).json({ error: 'Failed to save record' });
  }
});

app.put('/api/records/:id', (req, res) => {
  const data = readJsonFile(RECORDS_FILE);
  if (!data) {
    return res.status(500).json({ error: 'Failed to read records' });
  }

  const index = data.records.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }

  data.records[index] = { ...data.records[index], ...req.body };

  if (writeJsonFile(RECORDS_FILE, data)) {
    res.json(data.records[index]);
  } else {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.get('/api/tips', (req, res) => {
  const data = readJsonFile(TIPS_FILE);
  if (!data) {
    return res.status(500).json({ error: 'Failed to read tips' });
  }
  
  const tips = data.tips || [];
  const shuffled = tips.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  res.json(selected);
});

app.get('/api/weekly-summary', (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const weekDates = getWeekDates(dateStr);
  
  const recordsData = readJsonFile(RECORDS_FILE);
  const tipsData = readJsonFile(TIPS_FILE);
  
  if (!recordsData || !tipsData) {
    return res.status(500).json({ error: 'Failed to read data' });
  }

  const records = recordsData.records || [];
  const dailyCalories = weekDates.map(date => {
    const dayRecords = records.filter(r => r.date === date);
    const totalCalories = dayRecords.reduce((sum, r) => sum + (r.nutrition?.calories || 0), 0);
    return { date, calories: totalCalories };
  });

  const allBalanceScores = records
    .filter(r => weekDates.includes(r.date))
    .map(r => r.nutrition?.balanceScore || 50);
  const averageBalance = allBalanceScores.length > 0
    ? Math.round(allBalanceScores.reduce((a, b) => a + b, 0) / allBalanceScores.length)
    : 50;

  const tips = tipsData.tips || [];
  const shuffledTips = tips.sort(() => 0.5 - Math.random());
  const selectedTips = shuffledTips.slice(0, 3);

  res.json({
    dailyCalories,
    tips: selectedTips,
    averageBalance,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
