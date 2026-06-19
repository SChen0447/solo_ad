import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'melodies.json');

app.use(cors());
app.use(bodyParser.json());

interface Note {
  beat: number;
  pitch: number;
}

interface Melody {
  id: string;
  name: string;
  tags: string[];
  notes: Note[];
  bpm: number;
  favorite: boolean;
  createdAt: string;
}

const loadMelodies = (): Melody[] => {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const saveMelodies = (melodies: Melody[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(melodies, null, 2), 'utf-8');
};

app.get('/api/melodies', (req, res) => {
  const melodies = loadMelodies();
  melodies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(melodies);
});

app.post('/api/melodies', (req, res) => {
  const { name, tags, notes, bpm } = req.body;
  if (!name || !notes || !Array.isArray(notes)) {
    return res.status(400).json({ error: 'Invalid melody data' });
  }
  const melodies = loadMelodies();
  const newMelody: Melody = {
    id: uuidv4(),
    name,
    tags: tags || [],
    notes,
    bpm: bpm || 120,
    favorite: false,
    createdAt: new Date().toISOString(),
  };
  melodies.push(newMelody);
  saveMelodies(melodies);
  res.json(newMelody);
});

app.put('/api/melodies/:id', (req, res) => {
  const { id } = req.params;
  const { name, tags, notes, bpm, favorite } = req.body;
  const melodies = loadMelodies();
  const index = melodies.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Melody not found' });
  }
  melodies[index] = {
    ...melodies[index],
    name: name ?? melodies[index].name,
    tags: tags ?? melodies[index].tags,
    notes: notes ?? melodies[index].notes,
    bpm: bpm ?? melodies[index].bpm,
    favorite: favorite ?? melodies[index].favorite,
  };
  saveMelodies(melodies);
  res.json(melodies[index]);
});

app.delete('/api/melodies/:id', (req, res) => {
  const { id } = req.params;
  const melodies = loadMelodies();
  const filtered = melodies.filter((m) => m.id !== id);
  if (filtered.length === melodies.length) {
    return res.status(404).json({ error: 'Melody not found' });
  }
  saveMelodies(filtered);
  res.json({ success: true });
});

app.post('/api/share', (req, res) => {
  const { melodyIds } = req.body;
  if (!melodyIds || !Array.isArray(melodyIds) || melodyIds.length === 0) {
    return res.status(400).json({ error: 'Invalid melody IDs' });
  }
  const melodies = loadMelodies();
  const selected = melodies.filter((m) => melodyIds.includes(m.id));
  const shareData = selected.map((m) => ({
    name: m.name,
    notes: m.notes,
    bpm: m.bpm,
    tags: m.tags,
  }));
  const encoded = encodeURIComponent(JSON.stringify(shareData));
  res.json({ shareUrl: `/?share=${encoded}` });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
