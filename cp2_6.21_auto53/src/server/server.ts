import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

type PlantType = 'succulent' | 'flower' | 'foliage' | 'herb';

interface Plant {
  id: string;
  name: string;
  species: string;
  type: PlantType;
  purchaseDate: string;
  photoUrl: string;
  wateringFrequencyDays: number;
  lastWateredDate: string;
  lastFertilizedDate: string | null;
  lastRepottedDate: string | null;
}

interface DiagnosisRecord {
  id: string;
  plantId: string;
  date: string;
  healthScore: number;
  photoUrl: string;
  notes: string;
}

const plants: Plant[] = [
  {
    id: '1',
    name: '小绿',
    species: '多肉植物',
    type: 'succulent',
    purchaseDate: '2024-03-15',
    photoUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    wateringFrequencyDays: 7,
    lastWateredDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: '2024-05-01',
    lastRepottedDate: '2024-04-01',
  },
  {
    id: '2',
    name: '玫瑰公主',
    species: '月季花',
    type: 'flower',
    purchaseDate: '2024-02-20',
    photoUrl: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&h=300&fit=crop',
    wateringFrequencyDays: 3,
    lastWateredDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: '2024-05-10',
    lastRepottedDate: null,
  },
  {
    id: '3',
    name: '绿萝小姐',
    species: '绿萝',
    type: 'foliage',
    purchaseDate: '2024-01-10',
    photoUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=300&fit=crop',
    wateringFrequencyDays: 5,
    lastWateredDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: null,
    lastRepottedDate: '2024-03-15',
  },
  {
    id: '4',
    name: '薄荷先生',
    species: '薄荷',
    type: 'herb',
    purchaseDate: '2024-04-05',
    photoUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=300&fit=crop',
    wateringFrequencyDays: 2,
    lastWateredDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: '2024-05-15',
    lastRepottedDate: null,
  },
  {
    id: '5',
    name: '仙人掌爷爷',
    species: '金琥仙人球',
    type: 'succulent',
    purchaseDate: '2023-12-01',
    photoUrl: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=300&fit=crop',
    wateringFrequencyDays: 60,
    lastWateredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: null,
    lastRepottedDate: '2024-02-01',
  },
  {
    id: '6',
    name: '龟背竹大叔',
    species: '龟背竹',
    type: 'foliage',
    purchaseDate: '2023-10-01',
    photoUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=300&fit=crop',
    wateringFrequencyDays: 10,
    lastWateredDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastFertilizedDate: '2024-03-01',
    lastRepottedDate: '2024-01-15',
  },
];

const diagnosisRecords: DiagnosisRecord[] = [
  {
    id: 'd1',
    plantId: '1',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    healthScore: 85,
    photoUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    notes: '状态良好，叶片饱满',
  },
  {
    id: 'd2',
    plantId: '1',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    healthScore: 92,
    photoUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    notes: '非常健康，有新叶长出',
  },
  {
    id: 'd3',
    plantId: '2',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    healthScore: 78,
    photoUrl: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&h=300&fit=crop',
    notes: '有轻微虫害，建议喷药',
  },
];

app.get('/api/plants', (_req, res) => {
  res.json(plants);
});

app.get('/api/plants/:id', (req, res) => {
  const plant = plants.find(p => p.id === req.params.id);
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' });
  }
  res.json(plant);
});

app.post('/api/plants', (req, res) => {
  const newPlant: Plant = {
    id: uuidv4(),
    ...req.body,
  };
  plants.push(newPlant);
  res.status(201).json(newPlant);
});

app.put('/api/plants/:id', (req, res) => {
  const index = plants.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '植物不存在' });
  }
  plants[index] = { ...plants[index], ...req.body };
  res.json(plants[index]);
});

app.delete('/api/plants/:id', (req, res) => {
  const index = plants.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '植物不存在' });
  }
  plants.splice(index, 1);
  res.json({ message: '删除成功' });
});

app.get('/api/plants/:id/diagnosis', (req, res) => {
  const records = diagnosisRecords
    .filter(r => r.plantId === req.params.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(records);
});

app.post('/api/plants/:id/diagnosis', (req, res) => {
  const plant = plants.find(p => p.id === req.params.id);
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' });
  }
  const newRecord: DiagnosisRecord = {
    id: uuidv4(),
    plantId: req.params.id,
    date: new Date().toISOString().split('T')[0],
    healthScore: req.body.healthScore ?? Math.floor(Math.random() * 40) + 60,
    photoUrl: req.body.photoUrl || plant.photoUrl,
    notes: req.body.notes || '',
  };
  diagnosisRecords.push(newRecord);
  res.status(201).json(newRecord);
});

app.get('/api/reminders', (_req, res) => {
  const today = new Date();
  const reminders: Array<{
    plantId: string;
    plantName: string;
    type: 'water' | 'fertilizer';
    daysUntil: number;
    plantType: PlantType;
  }> = [];

  plants.forEach(plant => {
    const lastWatered = new Date(plant.lastWateredDate);
    const nextWatering = new Date(lastWatered);
    nextWatering.setDate(nextWatering.getDate() + plant.wateringFrequencyDays);
    const daysUntilWater = Math.ceil((nextWatering.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilWater <= 3) {
      reminders.push({
        plantId: plant.id,
        plantName: plant.name,
        type: 'water',
        daysUntil: daysUntilWater,
        plantType: plant.type,
      });
    }
  });

  reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  res.json(reminders);
});

app.post('/api/plants/:id/water', (req, res) => {
  const plant = plants.find(p => p.id === req.params.id);
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' });
  }
  plant.lastWateredDate = new Date().toISOString().split('T')[0];
  res.json(plant);
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
