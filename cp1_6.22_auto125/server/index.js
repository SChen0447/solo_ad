import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let familyMembers = [
  {
    id: '1',
    name: '爸爸',
    preferences: ['低碳水'],
    allergens: ['花生']
  },
  {
    id: '2',
    name: '妈妈',
    preferences: ['素食'],
    allergens: ['海鲜']
  },
  {
    id: '3',
    name: '小明',
    preferences: [],
    allergens: ['无乳糖']
  }
];

let inventory = [
  { id: '1', name: '西红柿', quantity: 5, unit: '个', expiryDate: getDateString(2) },
  { id: '2', name: '鸡蛋', quantity: 10, unit: '个', expiryDate: getDateString(7) },
  { id: '3', name: '土豆', quantity: 3, unit: '个', expiryDate: getDateString(14) },
  { id: '4', name: '牛奶', quantity: 1, unit: '盒', expiryDate: getDateString(1) },
  { id: '5', name: '鸡胸肉', quantity: 500, unit: '克', expiryDate: getDateString(3) },
  { id: '6', name: '西兰花', quantity: 2, unit: '颗', expiryDate: getDateString(2) },
  { id: '7', name: '大米', quantity: 5, unit: '公斤', expiryDate: getDateString(90) },
  { id: '8', name: '豆腐', quantity: 2, unit: '块', expiryDate: getDateString(4) }
];

function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

const recipes = [
  {
    id: '1',
    name: '番茄炒蛋',
    ingredients: [
      { name: '西红柿', quantity: 2, unit: '个' },
      { name: '鸡蛋', quantity: 3, unit: '个' },
      { name: '盐', quantity: 1, unit: '克' },
      { name: '糖', quantity: 5, unit: '克' }
    ],
    steps: [
      '将西红柿洗净切块，鸡蛋打散备用',
      '热锅倒油，倒入蛋液翻炒至凝固后盛出',
      '锅中再加少许油，放入西红柿翻炒出汁',
      '加入炒好的鸡蛋，加盐和糖调味',
      '翻炒均匀即可出锅'
    ],
    tags: ['家常', '快手菜', '素食']
  },
  {
    id: '2',
    name: '土豆炖牛肉',
    ingredients: [
      { name: '土豆', quantity: 2, unit: '个' },
      { name: '牛肉', quantity: 300, unit: '克' },
      { name: '洋葱', quantity: 1, unit: '个' },
      { name: '生抽', quantity: 15, unit: '毫升' },
      { name: '盐', quantity: 2, unit: '克' }
    ],
    steps: [
      '牛肉切块焯水去血沫，土豆去皮切块',
      '热锅倒油，放入洋葱炒香',
      '加入牛肉翻炒，加生抽上色',
      '加入适量水大火烧开后转小火炖40分钟',
      '加入土豆继续炖20分钟，加盐调味即可'
    ],
    tags: ['家常菜', '下饭', '荤菜']
  },
  {
    id: '3',
    name: '蒜蓉西兰花',
    ingredients: [
      { name: '西兰花', quantity: 1, unit: '颗' },
      { name: '大蒜', quantity: 3, unit: '瓣' },
      { name: '盐', quantity: 1, unit: '克' },
      { name: '生抽', quantity: 10, unit: '毫升' }
    ],
    steps: [
      '西兰花掰成小朵，洗净沥干',
      '大蒜切末备用',
      '烧开水，加少许盐和油，将西兰花焯水2分钟捞出',
      '热锅倒油，爆香蒜末',
      '倒入西兰花快速翻炒，加盐和生抽调味即可'
    ],
    tags: ['素菜', '低脂', '快手菜']
  },
  {
    id: '4',
    name: '香煎鸡胸肉',
    ingredients: [
      { name: '鸡胸肉', quantity: 200, unit: '克' },
      { name: '黑胡椒', quantity: 1, unit: '克' },
      { name: '盐', quantity: 1, unit: '克' },
      { name: '橄榄油', quantity: 10, unit: '毫升' },
      { name: '柠檬汁', quantity: 5, unit: '毫升' }
    ],
    steps: [
      '鸡胸肉用刀背拍松，两面撒盐和黑胡椒腌制15分钟',
      '平底锅加热，倒入橄榄油',
      '放入鸡胸肉，中火煎至一面金黄（约4分钟）',
      '翻面继续煎3-4分钟至熟透',
      '挤上柠檬汁即可食用'
    ],
    tags: ['低碳水', '高蛋白', '健身餐']
  },
  {
    id: '5',
    name: '麻婆豆腐',
    ingredients: [
      { name: '豆腐', quantity: 1, unit: '块' },
      { name: '肉末', quantity: 100, unit: '克' },
      { name: '豆瓣酱', quantity: 15, unit: '克' },
      { name: '花椒粉', quantity: 2, unit: '克' },
      { name: '葱花', quantity: 5, unit: '克' }
    ],
    steps: [
      '豆腐切小块，放入加盐的开水中焯烫2分钟捞出',
      '热锅倒油，放入肉末炒散变色',
      '加入豆瓣酱炒出红油',
      '加入适量水烧开，放入豆腐轻轻推动',
      '小火煮5分钟，撒花椒粉和葱花即可'
    ],
    tags: ['川菜', '下饭', '家常菜']
  },
  {
    id: '6',
    name: '蛋炒饭',
    ingredients: [
      { name: '大米', quantity: 200, unit: '克' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '胡萝卜', quantity: 50, unit: '克' },
      { name: '豌豆', quantity: 30, unit: '克' },
      { name: '盐', quantity: 2, unit: '克' }
    ],
    steps: [
      '大米蒸熟晾凉，鸡蛋打散',
      '胡萝卜切小丁，豌豆洗净',
      '热锅倒油，倒入蛋液快速翻炒至半熟盛出',
      '锅中再加少许油，放入胡萝卜和豌豆翻炒',
      '加入米饭和炒好的鸡蛋，加盐翻炒均匀即可'
    ],
    tags: ['主食', '快手菜', '家常']
  },
  {
    id: '7',
    name: '西红柿鸡蛋面',
    ingredients: [
      { name: '面条', quantity: 200, unit: '克' },
      { name: '西红柿', quantity: 1, unit: '个' },
      { name: '鸡蛋', quantity: 1, unit: '个' },
      { name: '青菜', quantity: 50, unit: '克' },
      { name: '盐', quantity: 2, unit: '克' }
    ],
    steps: [
      '西红柿切块，青菜洗净，鸡蛋打散',
      '锅中水烧开，下面条煮至八成熟',
      '另起锅热油，炒香西红柿出汁',
      '加入适量水烧开，打入鸡蛋花',
      '放入青菜和煮好的面条，加盐调味即可'
    ],
    tags: ['主食', '汤面', '家常']
  },
  {
    id: '8',
    name: '土豆丝',
    ingredients: [
      { name: '土豆', quantity: 2, unit: '个' },
      { name: '醋', quantity: 15, unit: '毫升' },
      { name: '盐', quantity: 1, unit: '克' },
      { name: '干辣椒', quantity: 3, unit: '个' },
      { name: '葱花', quantity: 5, unit: '克' }
    ],
    steps: [
      '土豆去皮切细丝，用清水浸泡去淀粉',
      '干辣椒切段，葱切葱花',
      '热锅倒油，爆香干辣椒',
      '捞出土豆丝沥干水分，放入锅中大火快炒',
      '加盐和醋调味，撒葱花出锅即可'
    ],
    tags: ['素菜', '快手菜', '家常']
  }
];

app.get('/api/family', (req, res) => {
  res.json(familyMembers);
});

app.post('/api/family', (req, res) => {
  const newMember = {
    id: uuidv4(),
    name: req.body.name,
    preferences: req.body.preferences || [],
    allergens: req.body.allergens || []
  };
  familyMembers.push(newMember);
  res.status(201).json(newMember);
});

app.put('/api/family/:id', (req, res) => {
  const memberId = req.params.id;
  const memberIndex = familyMembers.findIndex(m => m.id === memberId);
  if (memberIndex === -1) {
    return res.status(404).json({ error: '家庭成员不存在' });
  }
  familyMembers[memberIndex] = {
    ...familyMembers[memberIndex],
    name: req.body.name ?? familyMembers[memberIndex].name,
    preferences: req.body.preferences ?? familyMembers[memberIndex].preferences,
    allergens: req.body.allergens ?? familyMembers[memberIndex].allergens
  };
  res.json(familyMembers[memberIndex]);
});

app.delete('/api/family/:id', (req, res) => {
  const memberId = req.params.id;
  familyMembers = familyMembers.filter(m => m.id !== memberId);
  res.status(204).send();
});

app.get('/api/inventory', (req, res) => {
  res.json(inventory);
});

app.post('/api/inventory', (req, res) => {
  const newItem = {
    id: uuidv4(),
    name: req.body.name,
    quantity: req.body.quantity,
    unit: req.body.unit,
    expiryDate: req.body.expiryDate
  };
  inventory.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/inventory/:id', (req, res) => {
  const itemId = req.params.id;
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: '食材不存在' });
  }
  inventory[itemIndex] = {
    ...inventory[itemIndex],
    name: req.body.name ?? inventory[itemIndex].name,
    quantity: req.body.quantity ?? inventory[itemIndex].quantity,
    unit: req.body.unit ?? inventory[itemIndex].unit,
    expiryDate: req.body.expiryDate ?? inventory[itemIndex].expiryDate
  };
  res.json(inventory[itemIndex]);
});

app.delete('/api/inventory/:id', (req, res) => {
  const itemId = req.params.id;
  inventory = inventory.filter(i => i.id !== itemId);
  res.status(204).send();
});

app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '菜谱不存在' });
  }
  res.json(recipe);
});

app.get('/api/recommend', (req, res) => {
  const keyword = req.query.keyword || '';
  const useOnlyAvailable = req.query.onlyAvailable === 'true';

  const inventoryNames = inventory.map(item => item.name.toLowerCase());

  let matchedRecipes = recipes.map(recipe => {
    let score = 0;
    let matchedIngredients = 0;
    const totalIngredients = recipe.ingredients.length;

    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      if (recipe.name.toLowerCase().includes(keywordLower)) {
        score += 30;
      }
      recipe.tags.forEach(tag => {
        if (tag.toLowerCase().includes(keywordLower)) {
          score += 10;
        }
      });
    }

    recipe.ingredients.forEach(ingredient => {
      const ingNameLower = ingredient.name.toLowerCase();
      if (inventoryNames.includes(ingNameLower)) {
        matchedIngredients++;
        score += 15;
      }
    });

    if (totalIngredients > 0) {
      score += Math.floor((matchedIngredients / totalIngredients) * 40);
    }

    if (!keyword && score === 0) {
      score = 50 + Math.floor(Math.random() * 20);
    }

    return {
      ...recipe,
      matchScore: Math.min(score, 100),
      matchedIngredients,
      totalIngredients
    };
  });

  if (useOnlyAvailable) {
    matchedRecipes = matchedRecipes.filter(recipe => {
      return recipe.matchedIngredients / recipe.totalIngredients >= 0.6;
    });
  }

  matchedRecipes.sort((a, b) => b.matchScore - a.matchScore);

  const top5 = matchedRecipes.slice(0, 5);

  res.json(top5);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
