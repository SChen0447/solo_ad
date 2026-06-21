import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getDataPath = (filename) => path.join(DATA_DIR, filename);

const readJSON = (filename) => {
  const filePath = getDataPath(filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
};

const writeJSON = (filename, data) => {
  fs.writeFileSync(getDataPath(filename), JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/chapters', (req, res) => {
  const chapters = readJSON('chapters.json');
  res.json(chapters);
});

app.post('/api/chapters', (req, res) => {
  const chapters = readJSON('chapters.json');
  const newChapter = {
    id: uuidv4(),
    title: req.body.title || '未命名章节',
    content: req.body.content || '',
    type: req.body.type || 'plot',
    characters: req.body.characters || [],
    events: req.body.events || [],
    timestamp: Date.now(),
    order: chapters.length,
  };
  chapters.push(newChapter);
  writeJSON('chapters.json', chapters);
  res.json(newChapter);
});

app.put('/api/chapters/:id', (req, res) => {
  const chapters = readJSON('chapters.json');
  const index = chapters.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Chapter not found' });
  }
  chapters[index] = { ...chapters[index], ...req.body, id: req.params.id };
  writeJSON('chapters.json', chapters);
  res.json(chapters[index]);
});

app.delete('/api/chapters/:id', (req, res) => {
  let chapters = readJSON('chapters.json');
  chapters = chapters.filter((c) => c.id !== req.params.id);
  writeJSON('chapters.json', chapters);
  res.json({ success: true });
});

app.get('/api/characters', (req, res) => {
  const characters = readJSON('characters.json');
  res.json(characters);
});

app.post('/api/characters', (req, res) => {
  const characters = readJSON('characters.json');
  const newCharacter = {
    id: uuidv4(),
    name: req.body.name || '未命名角色',
    color: req.body.color || '#667eea',
    description: req.body.description || '',
  };
  characters.push(newCharacter);
  writeJSON('characters.json', characters);
  res.json(newCharacter);
});

app.put('/api/characters/:id', (req, res) => {
  const characters = readJSON('characters.json');
  const index = characters.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Character not found' });
  }
  characters[index] = { ...characters[index], ...req.body, id: req.params.id };
  writeJSON('characters.json', characters);
  res.json(characters[index]);
});

app.get('/api/relations', (req, res) => {
  const relations = readJSON('relations.json');
  res.json(relations);
});

app.post('/api/relations', (req, res) => {
  const relations = readJSON('relations.json');
  const newRelation = {
    id: uuidv4(),
    source: req.body.source,
    target: req.body.target,
    strength: req.body.strength || 1,
    type: req.body.type || 'friend',
  };
  relations.push(newRelation);
  writeJSON('relations.json', relations);
  res.json(newRelation);
});

app.put('/api/relations/:id', (req, res) => {
  const relations = readJSON('relations.json');
  const index = relations.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Relation not found' });
  }
  relations[index] = { ...relations[index], ...req.body, id: req.params.id };
  writeJSON('relations.json', relations);
  res.json(relations[index]);
});

app.delete('/api/relations/:id', (req, res) => {
  let relations = readJSON('relations.json');
  relations = relations.filter((r) => r.id !== req.params.id);
  writeJSON('relations.json', relations);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
