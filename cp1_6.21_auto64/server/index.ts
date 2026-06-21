import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  stock: number;
  unit: string;
  minStock: number;
  price: number;
}

interface DishIngredient {
  ingredientId: string;
  amount: number;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  ingredients: DishIngredient[];
  soldOut: boolean;
  manualSoldOut: boolean;
}

interface Order {
  id: string;
  dishId: string;
  dishName: string;
  timestamp: string;
}

interface Data {
  dishes: Dish[];
  ingredients: Ingredient[];
  orders: Order[];
}

const app = express();
app.use(cors());
app.use(express.json());

function readData(): Data {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: Data): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function computeSoldOut(dishes: Dish[], ingredients: Ingredient[]): Dish[] {
  return dishes.map(dish => {
    if (dish.manualSoldOut) {
      return { ...dish, soldOut: true };
    }
    const isSoldOut = dish.ingredients.some(di => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      return !ing || ing.stock < di.amount;
    });
    return { ...dish, soldOut: isSoldOut };
  });
}

app.get('/api/dishes', (_req: Request, res: Response) => {
  const data = readData();
  const dishes = computeSoldOut(data.dishes, data.ingredients);
  res.json(dishes);
});

app.post('/api/dishes', (req: Request, res: Response) => {
  const { name, price, ingredients } = req.body;
  if (!name || price == null || !ingredients) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const data = readData();
  const newDish: Dish = {
    id: uuidv4(),
    name,
    price: Number(price),
    ingredients,
    soldOut: false,
    manualSoldOut: false,
  };
  data.dishes.push(newDish);
  const updatedDishes = computeSoldOut(data.dishes, data.ingredients);
  data.dishes = updatedDishes;
  writeData(data);
  res.status(201).json(updatedDishes.find(d => d.id === newDish.id));
});

app.put('/api/dishes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, ingredients, manualSoldOut } = req.body;
  const data = readData();
  const idx = data.dishes.findIndex(d => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '菜品不存在' });
    return;
  }
  if (name !== undefined) data.dishes[idx].name = name;
  if (price !== undefined) data.dishes[idx].price = Number(price);
  if (ingredients !== undefined) data.dishes[idx].ingredients = ingredients;
  if (manualSoldOut !== undefined) data.dishes[idx].manualSoldOut = manualSoldOut;
  const updatedDishes = computeSoldOut(data.dishes, data.ingredients);
  data.dishes = updatedDishes;
  writeData(data);
  res.json(data.dishes.find(d => d.id === id));
});

app.delete('/api/dishes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const idx = data.dishes.findIndex(d => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '菜品不存在' });
    return;
  }
  data.dishes.splice(idx, 1);
  writeData(data);
  res.status(204).send();
});

app.get('/api/ingredients', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.ingredients);
});

app.post('/api/ingredients', (req: Request, res: Response) => {
  const { name, emoji, stock, unit, minStock, price } = req.body;
  if (!name || stock == null || !unit || minStock == null || price == null) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const data = readData();
  const newIng: Ingredient = {
    id: uuidv4(),
    name,
    emoji: emoji || '🥗',
    stock: Number(stock),
    unit,
    minStock: Number(minStock),
    price: Number(price),
  };
  data.ingredients.push(newIng);
  writeData(data);
  res.status(201).json(newIng);
});

app.put('/api/ingredients/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const idx = data.ingredients.findIndex(i => i.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '食材不存在' });
    return;
  }
  const { name, emoji, stock, unit, minStock, price } = req.body;
  if (name !== undefined) data.ingredients[idx].name = name;
  if (emoji !== undefined) data.ingredients[idx].emoji = emoji;
  if (stock !== undefined) data.ingredients[idx].stock = Number(stock);
  if (unit !== undefined) data.ingredients[idx].unit = unit;
  if (minStock !== undefined) data.ingredients[idx].minStock = Number(minStock);
  if (price !== undefined) data.ingredients[idx].price = Number(price);
  writeData(data);
  res.json(data.ingredients[idx]);
});

app.post('/api/consume', (req: Request, res: Response) => {
  const { dishId } = req.body;
  if (!dishId) {
    res.status(400).json({ error: '缺少菜品ID' });
    return;
  }
  const data = readData();
  const dish = data.dishes.find(d => d.id === dishId);
  if (!dish) {
    res.status(404).json({ error: '菜品不存在' });
    return;
  }
  for (const di of dish.ingredients) {
    const ing = data.ingredients.find(i => i.id === di.ingredientId);
    if (!ing || ing.stock < di.amount) {
      res.status(400).json({ error: `食材不足: ${ing ? ing.name : '未知食材'}` });
      return;
    }
  }
  for (const di of dish.ingredients) {
    const ing = data.ingredients.find(i => i.id === di.ingredientId)!;
    ing.stock -= di.amount;
  }
  const order: Order = {
    id: uuidv4(),
    dishId: dish.id,
    dishName: dish.name,
    timestamp: new Date().toISOString(),
  };
  data.orders.push(order);
  const updatedDishes = computeSoldOut(data.dishes, data.ingredients);
  data.dishes = updatedDishes;
  writeData(data);
  res.json({
    success: true,
    order,
    ingredients: data.ingredients,
    dishes: data.dishes,
  });
});

app.get('/api/reorder', (_req: Request, res: Response) => {
  const data = readData();
  const lowStock = data.ingredients.filter(i => i.stock < i.minStock);
  const suggestions = lowStock.map(ing => {
    const targetStock = ing.minStock * 2;
    const reorderAmount = Math.max(0, targetStock - ing.stock);
    return {
      id: ing.id,
      name: ing.name,
      emoji: ing.emoji,
      currentStock: ing.stock,
      minStock: ing.minStock,
      unit: ing.unit,
      unitPrice: ing.price,
      reorderAmount,
      estimatedCost: reorderAmount * ing.price,
      shortage: ing.minStock - ing.stock,
    };
  });
  suggestions.sort((a, b) => b.shortage / b.minStock - a.shortage / a.minStock);
  const totalEstimated = suggestions.reduce((sum, s) => sum + s.estimatedCost, 0);
  res.json({ suggestions, totalEstimated });
});

app.get('/api/orders', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.orders);
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
