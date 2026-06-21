import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  Pet,
  PetType,
  Interaction,
  ActionType,
  InteractionType,
  PET_PRESETS,
  SICK_THRESHOLD,
  SICK_DURATION,
  STATE_DECREASE_INTERVAL,
  WARNING_THRESHOLD
} from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ServerState {
  pets: Map<string, Pet>;
  interactions: Interaction[];
}

const state: ServerState = {
  pets: new Map(),
  interactions: []
};

const ownerId = 'current-user';

function calculateMood(pet: Pet): Pet['mood'] {
  const { hunger, happiness, energy } = pet.stats;
  
  if (pet.isSick) return 'sick';
  if (hunger < WARNING_THRESHOLD) return 'hungry';
  if (energy < WARNING_THRESHOLD) return 'sleepy';
  if (happiness < WARNING_THRESHOLD) return 'bored';
  return 'happy';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function checkSickStatus(pet: Pet): Pet {
  const { hunger, happiness, energy } = pet.stats;
  const now = Date.now();
  
  if (hunger < SICK_THRESHOLD && happiness < SICK_THRESHOLD && energy < SICK_THRESHOLD) {
    if (!pet.isSick) {
      pet.isSick = true;
      pet.sickStartTime = now;
    } else if (pet.sickStartTime && (now - pet.sickStartTime) > SICK_DURATION) {
      state.pets.delete(pet.id);
      return pet;
    }
  } else if (pet.isSick) {
    pet.isSick = false;
    pet.sickStartTime = undefined;
  }
  
  pet.mood = calculateMood(pet);
  return pet;
}

function decreaseStats(): void {
  const now = Date.now();
  state.pets.forEach(pet => {
    if (!pet.isSick || (pet.sickStartTime && (now - pet.sickStartTime) <= SICK_DURATION)) {
      pet.stats.hunger = clamp(pet.stats.hunger - 5, 0, 100);
      pet.stats.happiness = clamp(pet.stats.happiness - 3, 0, 100);
      pet.stats.energy = clamp(pet.stats.energy - 2, 0, 100);
      checkSickStatus(pet);
    }
  });
}

setInterval(decreaseStats, STATE_DECREASE_INTERVAL);

app.get('/api/pets', (req, res) => {
  const pets = Array.from(state.pets.values());
  res.json(pets);
});

app.get('/api/pets/mine', (req, res) => {
  const myPets = Array.from(state.pets.values()).filter(p => p.ownerId === ownerId);
  res.json(myPets);
});

app.get('/api/pets/:id', (req, res) => {
  const pet = state.pets.get(req.params.id);
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  res.json(pet);
});

app.post('/api/pets/adopt', (req, res) => {
  const { type, name }: { type: PetType; name: string } = req.body;
  
  const preset = PET_PRESETS.find(p => p.type === type);
  if (!preset) {
    return res.status(400).json({ error: '无效的宠物类型' });
  }
  
  const existingPet = Array.from(state.pets.values()).find(p => p.ownerId === ownerId);
  if (existingPet) {
    return res.status(400).json({ error: '您已经有一只宠物了' });
  }
  
  const newPet: Pet = {
    id: uuidv4(),
    name: name || preset.name,
    type,
    ownerId,
    stats: { ...preset.initialStats },
    mood: 'happy',
    isSick: false,
    lastActionTime: { feed: 0, play: 0, sleep: 0 },
    createdAt: Date.now()
  };
  
  newPet.mood = calculateMood(newPet);
  state.pets.set(newPet.id, newPet);
  res.json(newPet);
});

app.post('/api/pets/:id/action', (req, res) => {
  const { action }: { action: ActionType } = req.body;
  const pet = state.pets.get(req.params.id);
  
  if (!pet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  if (pet.ownerId !== ownerId) {
    return res.status(403).json({ error: '只能操作自己的宠物' });
  }
  
  if (pet.isSick) {
    return res.status(400).json({ error: '宠物生病了，无法操作' });
  }
  
  const now = Date.now();
  const cooldown = 2000;
  if (now - pet.lastActionTime[action] < cooldown) {
    return res.status(429).json({ error: '操作太频繁，请稍后再试' });
  }
  
  switch (action) {
    case 'feed':
      pet.stats.hunger = clamp(pet.stats.hunger + 20, 0, 100);
      break;
    case 'play':
      pet.stats.happiness = clamp(pet.stats.happiness + 15, 0, 100);
      pet.stats.energy = clamp(pet.stats.energy - 10, 0, 100);
      break;
    case 'sleep':
      pet.stats.energy = clamp(pet.stats.energy + 25, 0, 100);
      break;
  }
  
  pet.lastActionTime[action] = now;
  checkSickStatus(pet);
  res.json(pet);
});

app.post('/api/pets/:id/interact', (req, res) => {
  const { fromPetId, type }: { fromPetId: string; type: InteractionType } = req.body;
  const toPet = state.pets.get(req.params.id);
  const fromPet = state.pets.get(fromPetId);
  
  if (!toPet || !fromPet) {
    return res.status(404).json({ error: '宠物不存在' });
  }
  
  if (fromPet.ownerId !== ownerId) {
    return res.status(403).json({ error: '只能用自己的宠物互动' });
  }
  
  const happinessIncrease = Math.floor(Math.random() * 6) + 5;
  fromPet.stats.happiness = clamp(fromPet.stats.happiness + happinessIncrease, 0, 100);
  toPet.stats.happiness = clamp(toPet.stats.happiness + happinessIncrease, 0, 100);
  
  checkSickStatus(fromPet);
  checkSickStatus(toPet);
  
  const interaction: Interaction = {
    id: uuidv4(),
    fromPetId,
    toPetId: toPet.id,
    type,
    timestamp: Date.now()
  };
  state.interactions.push(interaction);
  
  res.json({ fromPet, toPet, interaction, happinessIncrease });
});

app.get('/api/interactions', (req, res) => {
  res.json(state.interactions);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
