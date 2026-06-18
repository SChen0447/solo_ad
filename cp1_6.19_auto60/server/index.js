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

app.use(cors());
app.use(express.json());

let inventory = [];

const recipesPath = path.join(__dirname, 'recipeData.json');
const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));

function calculateMatch(recipe, inv) {
  const requiredIngredients = recipe.ingredients;
  const invNames = inv.map((item) => item.name.toLowerCase());
  let matched = 0;

  requiredIngredients.forEach((ing) => {
    if (invNames.includes(ing.name.toLowerCase())) {
      matched++;
    }
  });

  const percentage = requiredIngredients.length > 0
    ? Math.round((matched / requiredIngredients.length) * 100)
    : 0;

  const missing = requiredIngredients
    .filter((ing) => !invNames.includes(ing.name.toLowerCase()))
    .map((ing) => ing.name);

  return { percentage, missing };
}

app.get('/api/recipes', (_req, res) => {
  res.json(recipes);
});

app.get('/api/inventory', (_req, res) => {
  res.json(inventory);
});

app.post('/api/inventory', (req, res) => {
  const { name, amount, unit } = req.body;
  if (!name || amount === undefined || !unit) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const newItem = {
    id: uuidv4(),
    name,
    amount: Number(amount),
    unit,
  };
  inventory.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, amount, unit } = req.body;
  const idx = inventory.findIndex((item) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '食材未找到' });
  }
  inventory[idx] = {
    ...inventory[idx],
    name: name ?? inventory[idx].name,
    amount: amount !== undefined ? Number(amount) : inventory[idx].amount,
    unit: unit ?? inventory[idx].unit,
  };
  res.json(inventory[idx]);
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const idx = inventory.findIndex((item) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '食材未找到' });
  }
  const [removed] = inventory.splice(idx, 1);
  res.json(removed);
});

app.post('/api/recommend', (req, res) => {
  const { inventory: inv, filters } = req.body;
  let results = recipes.map((recipe) => {
    const { percentage, missing } = calculateMatch(recipe, inv || []);
    return { ...recipe, matchPercentage: percentage, missingIngredients: missing };
  });

  if (filters) {
    if (filters.maxCookTime) {
      results = results.filter((r) => r.cookTime <= filters.maxCookTime);
    }
    if (filters.cuisine && filters.cuisine !== '全部') {
      results = results.filter((r) => r.cuisine === filters.cuisine);
    }
    if (filters.difficulty && filters.difficulty !== '全部') {
      results = results.filter((r) => r.difficulty === filters.difficulty);
    }
  }

  results.sort((a, b) => b.matchPercentage - a.matchPercentage);

  setTimeout(() => {
    res.json(results);
  }, 100);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
