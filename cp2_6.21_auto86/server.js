import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const recipes = [
  { id: '1', name: '宫保鸡丁', cuisine: '中餐', ingredients: ['鸡肉', '花生', '青椒', '大蒜'] },
  { id: '2', name: '番茄炒蛋', cuisine: '中餐', ingredients: ['番茄', '鸡蛋', '盐', '糖'] },
  { id: '3', name: '红烧牛肉', cuisine: '中餐', ingredients: ['牛肉', '胡萝卜', '洋葱', '生姜'] },
  { id: '4', name: '麻婆豆腐', cuisine: '中餐', ingredients: ['豆腐', '猪肉', '大蒜', '青椒'] },
  { id: '5', name: '清蒸鱼', cuisine: '中餐', ingredients: ['鱼', '生姜', '酱油', '洋葱'] },
  { id: '6', name: '意大利面', cuisine: '西餐', ingredients: ['意大利面', '番茄', '牛肉', '洋葱'] },
  { id: '7', name: '凯撒沙拉', cuisine: '西餐', ingredients: ['面包', '奶酪', '生菜', '橄榄油'] },
  { id: '8', name: '奶油蘑菇汤', cuisine: '西餐', ingredients: ['蘑菇', '奶油', '洋葱', '黄油'] },
  { id: '9', name: '烤三文鱼', cuisine: '西餐', ingredients: ['三文鱼', '柠檬', '橄榄油', '盐'] },
  { id: '10', name: '牛肉汉堡', cuisine: '西餐', ingredients: ['牛肉', '面包', '奶酪', '洋葱'] },
  { id: '11', name: '味噌汤', cuisine: '日料', ingredients: ['味噌', '豆腐', '海带', '洋葱'] },
  { id: '12', name: '寿司', cuisine: '日料', ingredients: ['米饭', '三文鱼', '紫菜', '醋'] },
  { id: '13', name: '天妇罗', cuisine: '日料', ingredients: ['虾', '面粉', '鸡蛋', '油'] },
  { id: '14', name: '日式咖喱', cuisine: '日料', ingredients: ['牛肉', '土豆', '胡萝卜', '洋葱'] },
  { id: '15', name: '拉面', cuisine: '日料', ingredients: ['面条', '鸡蛋', '猪肉', '海带'] },
];

let availableIngredients = ['鸡肉', '鸡蛋', '番茄', '米饭', '豆腐', '牛肉', '洋葱', '胡萝卜', '土豆', '蘑菇'];

app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.post('/api/recipes', (req, res) => {
  const { name, cuisine, ingredients } = req.body;
  if (!name || !cuisine || !ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: '请填写完整的食谱信息' });
  }
  const newRecipe = { id: uuidv4(), name, cuisine, ingredients };
  recipes.push(newRecipe);
  res.json(newRecipe);
});

app.delete('/api/recipes/:id', (req, res) => {
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '食谱不存在' });
  recipes.splice(idx, 1);
  res.json({ success: true });
});

app.get('/api/ingredients', (req, res) => {
  res.json(availableIngredients);
});

app.post('/api/ingredients', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '食材名称不能为空' });
  if (!availableIngredients.includes(name.trim())) {
    availableIngredients.push(name.trim());
  }
  res.json(availableIngredients);
});

app.delete('/api/ingredients/:name', (req, res) => {
  availableIngredients = availableIngredients.filter(i => i !== req.params.name);
  res.json(availableIngredients);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
