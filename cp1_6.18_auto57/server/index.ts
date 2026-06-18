import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, CreateRecipeRequest } from '../src/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    title: '番茄炒蛋',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    ingredients: [
      { name: '番茄', amount: 200, unit: 'g', caloriesPer100g: 19, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 3.9 },
      { name: '鸡蛋', amount: 150, unit: 'g', caloriesPer100g: 144, proteinPer100g: 13.3, fatPer100g: 8.8, carbsPer100g: 2.8 },
      { name: '食用油', amount: 15, unit: 'g', caloriesPer100g: 899, proteinPer100g: 0, fatPer100g: 99.9, carbsPer100g: 0 },
      { name: '葱花', amount: 10, unit: 'g', caloriesPer100g: 25, proteinPer100g: 1.6, fatPer100g: 0.3, carbsPer100g: 4.9 },
    ],
    steps: '1. 番茄切块，鸡蛋打散备用\n2. 热锅下油，倒入蛋液炒至凝固盛出\n3. 锅中再加少许油，放入番茄翻炒出汁\n4. 加入炒好的鸡蛋，加盐调味\n5. 撒上葱花出锅即可',
    createdAt: Date.now() - 86400000,
    favorite: false,
  },
  {
    id: uuidv4(),
    title: '牛油果鸡胸肉沙拉',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    ingredients: [
      { name: '鸡胸肉', amount: 200, unit: 'g', caloriesPer100g: 165, proteinPer100g: 31, fatPer100g: 3.6, carbsPer100g: 0 },
      { name: '牛油果', amount: 150, unit: 'g', caloriesPer100g: 160, proteinPer100g: 2, fatPer100g: 15, carbsPer100g: 9 },
      { name: '生菜', amount: 100, unit: 'g', caloriesPer100g: 15, proteinPer100g: 1.4, fatPer100g: 0.2, carbsPer100g: 2.9 },
      { name: '樱桃番茄', amount: 80, unit: 'g', caloriesPer100g: 18, proteinPer100g: 0.9, fatPer100g: 0.2, carbsPer100g: 3.9 },
      { name: '橄榄油', amount: 10, unit: 'g', caloriesPer100g: 899, proteinPer100g: 0, fatPer100g: 99.9, carbsPer100g: 0 },
    ],
    steps: '1. 鸡胸肉用盐和黑胡椒腌制20分钟\n2. 平底锅煎鸡胸肉至两面金黄，切片备用\n3. 牛油果切块，生菜撕成小朵，番茄对半切\n4. 所有食材装入大碗，淋上橄榄油和柠檬汁拌匀',
    createdAt: Date.now() - 172800000,
    favorite: true,
  },
  {
    id: uuidv4(),
    title: '燕麦水果早餐碗',
    imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800',
    ingredients: [
      { name: '燕麦片', amount: 60, unit: 'g', caloriesPer100g: 389, proteinPer100g: 16.9, fatPer100g: 6.9, carbsPer100g: 66.3 },
      { name: '牛奶', amount: 200, unit: 'ml', caloriesPer100g: 54, proteinPer100g: 3, fatPer100g: 3.2, carbsPer100g: 3.4 },
      { name: '蓝莓', amount: 50, unit: 'g', caloriesPer100g: 57, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 14.5 },
      { name: '香蕉', amount: 100, unit: 'g', caloriesPer100g: 89, proteinPer100g: 1.1, fatPer100g: 0.3, carbsPer100g: 22.8 },
      { name: '蜂蜜', amount: 10, unit: 'g', caloriesPer100g: 304, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 82.4 },
    ],
    steps: '1. 燕麦片用热牛奶浸泡5分钟至软糯\n2. 香蕉切片，蓝莓洗净沥干\n3. 将水果铺在燕麦碗上\n4. 淋上蜂蜜即可享用',
    createdAt: Date.now() - 259200000,
    favorite: false,
  },
  {
    id: uuidv4(),
    title: '清炒西兰花虾仁',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    ingredients: [
      { name: '西兰花', amount: 300, unit: 'g', caloriesPer100g: 34, proteinPer100g: 2.8, fatPer100g: 0.4, carbsPer100g: 6.6 },
      { name: '虾仁', amount: 150, unit: 'g', caloriesPer100g: 99, proteinPer100g: 20.9, fatPer100g: 1.7, carbsPer100g: 0.2 },
      { name: '大蒜', amount: 15, unit: 'g', caloriesPer100g: 149, proteinPer100g: 6.4, fatPer100g: 0.5, carbsPer100g: 33 },
      { name: '食用油', amount: 15, unit: 'g', caloriesPer100g: 899, proteinPer100g: 0, fatPer100g: 99.9, carbsPer100g: 0 },
    ],
    steps: '1. 西兰花切小朵，用盐水浸泡后焯水1分钟\n2. 虾仁去虾线，用料酒和盐腌制\n3. 热锅下油，爆香蒜末\n4. 加入虾仁翻炒至变色\n5. 加入西兰花快速翻炒，调味出锅',
    createdAt: Date.now() - 345600000,
    favorite: false,
  },
];

app.get('/api/recipes', (_req: Request, res: Response) => {
  const sorted = [...recipes].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted);
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: '食谱不存在' });
    return;
  }
  res.json(recipe);
});

app.post('/api/recipes', (req: Request, res: Response) => {
  const data: CreateRecipeRequest = req.body;
  if (!data.title || !data.ingredients || data.ingredients.length === 0) {
    res.status(400).json({ error: '标题和配料列表不能为空' });
    return;
  }
  const newRecipe: Recipe = {
    id: uuidv4(),
    title: data.title.slice(0, 20),
    imageUrl: data.imageUrl,
    ingredients: data.ingredients,
    steps: data.steps,
    createdAt: Date.now(),
    favorite: false,
  };
  recipes.unshift(newRecipe);
  res.status(201).json(newRecipe);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

export default app;
