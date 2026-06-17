import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

interface Ingredient {
  name: string;
  amount: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coverImage: string;
  isFavorite: boolean;
}

interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
}

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '番茄炒蛋',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱花', amount: '适量' },
      { name: '盐', amount: '1小勺' },
      { name: '糖', amount: '半勺' },
    ],
    steps: [
      '番茄切块，鸡蛋打散备用',
      '热锅冷油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入炒好的鸡蛋，加盐和糖调味',
      '撒上葱花出锅即可',
    ],
    cookTime: 15,
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1482049016gy-9e39f6379634?w=400&h=300&fit=crop',
    isFavorite: false,
  },
  {
    id: uuidv4(),
    name: '红烧肉',
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '料酒', amount: '2勺' },
      { name: '八角', amount: '2个' },
      { name: '姜片', amount: '3片' },
    ],
    steps: [
      '五花肉切块，冷水下锅焯水去血沫',
      '锅中放少许油，加入冰糖小火炒出糖色',
      '放入五花肉翻炒上色',
      '加入料酒、生抽、老抽调味',
      '加入八角、姜片和没过肉的热水',
      '大火烧开后转小火炖45分钟',
      '大火收汁即可',
    ],
    cookTime: 60,
    difficulty: 'medium',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    isFavorite: false,
  },
  {
    id: uuidv4(),
    name: '蒜蓉西兰花',
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '蚝油', amount: '1勺' },
    ],
    steps: [
      '西兰花掰成小朵，洗净备用',
      '大蒜切末',
      '锅中烧水，加少许盐和油，西兰花焯水1分钟',
      '热锅冷油，爆香蒜末',
      '放入西兰花翻炒，加蚝油和盐调味',
      '快速翻炒均匀出锅',
    ],
    cookTime: 10,
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1583608354155-90119ee969ca?w=400&h=300&fit=crop',
    isFavorite: false,
  },
  {
    id: uuidv4(),
    name: '糖醋里脊',
    ingredients: [
      { name: '猪里脊', amount: '300g' },
      { name: '淀粉', amount: '50g' },
      { name: '番茄酱', amount: '3勺' },
      { name: '白醋', amount: '2勺' },
      { name: '白糖', amount: '3勺' },
      { name: '盐', amount: '少许' },
      { name: '鸡蛋', amount: '1个' },
    ],
    steps: [
      '里脊切条，加盐、料酒、蛋液腌制15分钟',
      '裹上干淀粉',
      '油温六成热下锅炸至金黄捞出',
      '油温升高复炸30秒至酥脆',
      '锅中留底油，加番茄酱、白醋、白糖、少许水熬匀',
      '倒入炸好的里脊快速翻炒均匀',
    ],
    cookTime: 30,
    difficulty: 'hard',
    coverImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
    isFavorite: false,
  },
  {
    id: uuidv4(),
    name: '土豆炖牛肉',
    ingredients: [
      { name: '牛肉', amount: '400g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '番茄', amount: '1个' },
    ],
    steps: [
      '牛肉切块焯水，土豆胡萝卜切块',
      '锅中热油，炒香洋葱',
      '加入番茄炒出沙',
      '放入牛肉翻炒，加生抽老抽',
      '加热水没过食材，炖40分钟',
      '加入土豆胡萝卜继续炖20分钟',
      '大火收汁调味',
    ],
    cookTime: 70,
    difficulty: 'medium',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    isFavorite: false,
  },
  {
    id: uuidv4(),
    name: '凉拌黄瓜',
    ingredients: [
      { name: '黄瓜', amount: '2根' },
      { name: '大蒜', amount: '3瓣' },
      { name: '生抽', amount: '1勺' },
      { name: '醋', amount: '2勺' },
      { name: '香油', amount: '少许' },
      { name: '盐', amount: '适量' },
    ],
    steps: [
      '黄瓜拍碎切段',
      '加盐腌制10分钟，挤干水分',
      '大蒜切末',
      '加入蒜末、生抽、醋、香油拌匀',
      '冷藏10分钟更入味',
    ],
    cookTime: 20,
    difficulty: 'easy',
    coverImage: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=400&h=300&fit=crop',
    isFavorite: false,
  },
];

let fridge: FridgeItem[] = [
  { id: uuidv4(), name: '鸡蛋', quantity: '5个' },
  { id: uuidv4(), name: '番茄', quantity: '3个' },
  { id: uuidv4(), name: '黄瓜', quantity: '2根' },
  { id: uuidv4(), name: '大蒜', quantity: '10瓣' },
  { id: uuidv4(), name: '土豆', quantity: '2个' },
];

app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.post('/api/recipes', (req, res) => {
  const newRecipe: Recipe = {
    id: uuidv4(),
    isFavorite: false,
    ...req.body,
  };
  recipes.push(newRecipe);
  res.status(201).json(newRecipe);
});

app.patch('/api/recipes/:id/favorite', (req, res) => {
  const { id } = req.params;
  const index = recipes.findIndex((r) => r.id === id);
  if (index !== -1) {
    recipes[index].isFavorite = !recipes[index].isFavorite;
    res.json(recipes[index]);
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const index = recipes.findIndex((r) => r.id === id);
  if (index !== -1) {
    recipes[index] = { ...recipes[index], ...req.body };
    res.json(recipes[index]);
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const index = recipes.findIndex((r) => r.id === id);
  if (index !== -1) {
    recipes.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

app.get('/api/fridge', (req, res) => {
  res.json(fridge);
});

app.post('/api/fridge', (req, res) => {
  const newItem: FridgeItem = {
    id: uuidv4(),
    ...req.body,
  };
  fridge.push(newItem);
  res.status(201).json(newItem);
});

app.delete('/api/fridge/:id', (req, res) => {
  const { id } = req.params;
  const index = fridge.findIndex((f) => f.id === id);
  if (index !== -1) {
    fridge.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Fridge item not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
