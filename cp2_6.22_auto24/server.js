import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const plants = [
  {
    id: '1',
    name: '小番茄',
    category: 'fruit',
    maturityDays: 90,
    wateringFrequency: 2,
    fertilizingCycle: 14,
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cherry%20tomato%20plant%20in%20pot%20vibrant%20green&image_size=square',
  },
  {
    id: '2',
    name: '生菜',
    category: 'leaf',
    maturityDays: 45,
    wateringFrequency: 1,
    fertilizingCycle: 10,
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fresh%20lettuce%20in%20garden%20pot&image_size=square',
  },
  {
    id: '3',
    name: '胡萝卜',
    category: 'root',
    maturityDays: 70,
    wateringFrequency: 3,
    fertilizingCycle: 21,
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=carrot%20plant%20growing%20in%20soil&image_size=square',
  },
];

const plans = [
  {
    id: 'p1',
    plantId: '1',
    plantName: '小番茄',
    sowDate: '2026-06-01',
    pots: 3,
  },
  {
    id: 'p2',
    plantId: '2',
    plantName: '生菜',
    sowDate: '2026-06-10',
    pots: 2,
  },
];

const growthRecords = [
  {
    id: 'g1',
    planId: 'p1',
    date: '2026-06-15',
    photoUrl: '',
    height: 12,
    leafCount: 6,
    note: '幼苗期，长势良好',
  },
  {
    id: 'g2',
    planId: 'p1',
    date: '2026-06-18',
    photoUrl: '',
    height: 18,
    leafCount: 8,
    note: '开始分枝',
  },
  {
    id: 'g3',
    planId: 'p1',
    date: '2026-06-21',
    photoUrl: '',
    height: 25,
    leafCount: 12,
    note: '快速生长中',
  },
];

const completedTasks = new Set();

app.get('/api/plants', (req, res) => {
  res.json(plants);
});

app.post('/api/plants', (req, res) => {
  const plant = { id: uuidv4(), ...req.body };
  plants.push(plant);
  res.status(201).json(plant);
});

app.get('/api/plants/:id', (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id);
  if (!plant) return res.status(404).json({ error: 'Not found' });
  res.json(plant);
});

app.put('/api/plants/:id', (req, res) => {
  const idx = plants.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  plants[idx] = { ...plants[idx], ...req.body };
  res.json(plants[idx]);
});

app.delete('/api/plants/:id', (req, res) => {
  const idx = plants.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  plants.splice(idx, 1);
  res.status(204).end();
});

app.get('/api/plans', (req, res) => {
  res.json(plans);
});

app.post('/api/plans', (req, res) => {
  const plan = { id: uuidv4(), ...req.body };
  plans.push(plan);
  res.status(201).json(plan);
});

app.get('/api/plans/:id', (req, res) => {
  const plan = plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  const plant = plants.find((p) => p.id === plan.plantId);
  res.json({ ...plan, plant });
});

app.delete('/api/plans/:id', (req, res) => {
  const idx = plans.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  plans.splice(idx, 1);
  res.status(204).end();
});

app.get('/api/plans/:planId/records', (req, res) => {
  const records = growthRecords.filter((r) => r.planId === req.params.planId);
  const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
  res.json(sorted);
});

app.post('/api/plans/:planId/records', (req, res) => {
  const record = { id: uuidv4(), planId: req.params.planId, ...req.body };
  growthRecords.push(record);
  res.status(201).json(record);
});

app.delete('/api/records/:id', (req, res) => {
  const idx = growthRecords.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  growthRecords.splice(idx, 1);
  res.status(204).end();
});

app.get('/api/tasks/:date', (req, res) => {
  const targetDate = req.params.date;
  const tasks = [];

  for (const plan of plans) {
    const plant = plants.find((p) => p.id === plan.plantId);
    if (!plant) continue;

    const sowDate = new Date(plan.sowDate);
    const checkDate = new Date(targetDate);
    const diffDays = Math.floor((checkDate.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) continue;

    const harvestDate = new Date(sowDate);
    harvestDate.setDate(harvestDate.getDate() + plant.maturityDays);
    const harvestStr = harvestDate.toISOString().split('T')[0];

    if (diffDays % plant.wateringFrequency === 0 && diffDays > 0) {
      const taskKey = `${plan.id}-${targetDate}-water`;
      tasks.push({
        id: taskKey,
        planId: plan.id,
        planName: `${plant.name}(${plan.sowDate})`,
        type: 'water',
        label: '浇水',
        completed: completedTasks.has(taskKey),
        overdue: checkDate < new Date() && !completedTasks.has(taskKey),
      });
    }

    if (diffDays % plant.fertilizingCycle === 0 && diffDays > 0) {
      const taskKey = `${plan.id}-${targetDate}-fertilize`;
      tasks.push({
        id: taskKey,
        planId: plan.id,
        planName: `${plant.name}(${plan.sowDate})`,
        type: 'fertilize',
        label: '施肥',
        completed: completedTasks.has(taskKey),
        overdue: checkDate < new Date() && !completedTasks.has(taskKey),
      });
    }

    if (targetDate === harvestStr) {
      const taskKey = `${plan.id}-${targetDate}-harvest`;
      tasks.push({
        id: taskKey,
        planId: plan.id,
        planName: `${plant.name}(${plan.sowDate})`,
        type: 'harvest',
        label: '收获',
        completed: completedTasks.has(taskKey),
        overdue: false,
      });
    }
  }

  res.json(tasks);
});

app.post('/api/tasks/:taskKey/complete', (req, res) => {
  completedTasks.add(req.params.taskKey);
  res.json({ success: true });
});

app.post('/api/tasks/:taskKey/uncomplete', (req, res) => {
  completedTasks.delete(req.params.taskKey);
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
