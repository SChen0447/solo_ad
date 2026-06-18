import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

let pets = [
  {
    id: '1',
    name: '小花',
    species: 'cat',
    avatar: 'cat',
    hunger: 60,
    hygiene: 70,
    happiness: 80,
    health: 75,
    createdAt: Date.now(),
  },
  {
    id: '2',
    name: '小黑',
    species: 'dog',
    avatar: 'dog',
    hunger: 50,
    hygiene: 65,
    happiness: 55,
    health: 70,
    createdAt: Date.now(),
  },
  {
    id: '3',
    name: '小白',
    species: 'rabbit',
    avatar: 'rabbit',
    hunger: 40,
    hygiene: 80,
    happiness: 90,
    health: 85,
    createdAt: Date.now(),
  },
];

let nextId = 4;

app.get('/api/pets', (req, res) => {
  res.json(pets);
});

app.get('/api/pets/:id', (req, res) => {
  const pet = pets.find((p) => p.id === req.params.id);
  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  res.json(pet);
});

app.post('/api/pets', (req, res) => {
  const { name, species, avatar } = req.body;
  if (!name || !species) {
    return res.status(400).json({ error: 'Name and species are required' });
  }
  const newPet = {
    id: String(nextId++),
    name,
    species,
    avatar: avatar || species,
    hunger: 50,
    hygiene: 50,
    happiness: 50,
    health: 80,
    createdAt: Date.now(),
  };
  pets.push(newPet);
  res.status(201).json(newPet);
});

app.patch('/api/pets/:id', (req, res) => {
  const petIndex = pets.findIndex((p) => p.id === req.params.id);
  if (petIndex === -1) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  const updatedPet = { ...pets[petIndex], ...req.body, id: req.params.id };
  pets[petIndex] = updatedPet;
  res.json(updatedPet);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
