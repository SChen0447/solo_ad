import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let savedLevels = {};
let userProgress = {
  maxUnlockedLevel: 1,
};

app.get('/api/levels', (req, res) => {
  res.json({
    levels: Object.values(savedLevels),
    userProgress,
  });
});

app.post('/api/levels', (req, res) => {
  const levelData = req.body;
  const id = uuidv4();
  const newLevel = { id, ...levelData };
  savedLevels[id] = newLevel;
  res.status(201).json(newLevel);
});

app.put('/api/levels/:id', (req, res) => {
  const { id } = req.params;
  if (savedLevels[id]) {
    savedLevels[id] = { ...savedLevels[id], ...req.body };
    res.json(savedLevels[id]);
  } else {
    res.status(404).json({ error: 'Level not found' });
  }
});

app.delete('/api/levels/:id', (req, res) => {
  const { id } = req.params;
  if (savedLevels[id]) {
    delete savedLevels[id];
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Level not found' });
  }
});

app.post('/api/progress', (req, res) => {
  const { maxUnlockedLevel } = req.body;
  if (typeof maxUnlockedLevel === 'number' && maxUnlockedLevel > userProgress.maxUnlockedLevel) {
    userProgress.maxUnlockedLevel = maxUnlockedLevel;
  }
  res.json(userProgress);
});

app.get('/api/progress', (req, res) => {
  res.json(userProgress);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
