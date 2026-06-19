import express from 'express';
import cors from 'cors';

interface Ingredient {
  name: string;
  amount: string;
}

interface Recipe {
  id: number;
  name: string;
  emoji: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
}

const recipes: Recipe[] = [
  {
    id: 1,
    name: '番茄炒蛋',
    emoji: '🍅',
    description: '经典家常菜，酸甜可口，下饭神器',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱花', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '糖', amount: '1勺' },
    ],
    steps: [
      '番茄切块，鸡蛋打散备用',
      '热锅下油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入炒好的鸡蛋，加盐和糖调味',
      '撒上葱花即可出锅',
    ],
  },
  {
    id: 2,
    name: '青椒土豆丝',
    emoji: '🥔',
    description: '清脆爽口，简单易做的素食佳肴',
    ingredients: [
      { name: '土豆', amount: '2个' },
      { name: '青椒', amount: '1个' },
      { name: '蒜末', amount: '适量' },
      { name: '醋', amount: '1勺' },
      { name: '盐', amount: '少许' },
    ],
    steps: [
      '土豆去皮切丝，用清水浸泡去淀粉',
      '青椒切丝备用',
      '热锅下油，爆香蒜末',
      '放入土豆丝大火快炒，加醋',
      '加入青椒丝，放盐调味炒熟即可',
    ],
  },
  {
    id: 3,
    name: '红烧肉',
    emoji: '🥩',
    description: '肥而不腻，入口即化的经典硬菜',
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '料酒', amount: '2勺' },
      { name: '姜片', amount: '3片' },
      { name: '八角', amount: '2个' },
    ],
    steps: [
      '五花肉切块冷水下锅焯水去腥',
      '锅中放少许油，加入冰糖小火炒糖色',
      '糖色炒至枣红色后放入五花肉翻炒上色',
      '加入生抽、老抽、料酒调味',
      '加开水没过肉，放姜片和八角',
      '大火烧开转小火炖45分钟',
      '大火收汁即可',
    ],
  },
  {
    id: 4,
    name: '蒜蓉西兰花',
    emoji: '🥦',
    description: '健康营养，色香味俱全的素菜',
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '5瓣' },
      { name: '盐', amount: '少许' },
      { name: '蚝油', amount: '1勺' },
    ],
    steps: [
      '西兰花掰成小朵，用盐水浸泡10分钟',
      '大蒜切末备用',
      '锅中烧水，加少许盐和油，西兰花焯水2分钟捞出',
      '热锅下油，爆香蒜末',
      '放入西兰花，加蚝油和盐翻炒均匀即可',
    ],
  },
  {
    id: 5,
    name: '宫保鸡丁',
    emoji: '🍗',
    description: '酸甜微辣，鸡肉滑嫩的川菜经典',
    ingredients: [
      { name: '鸡胸肉', amount: '300g' },
      { name: '花生米', amount: '50g' },
      { name: '干辣椒', amount: '8个' },
      { name: '花椒', amount: '1勺' },
      { name: '葱白', amount: '适量' },
      { name: '生抽', amount: '2勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      '鸡胸肉切丁，用生抽和淀粉腌制15分钟',
      '干辣椒剪段，葱白切段',
      '调酱汁：生抽、醋、糖、淀粉和少许水',
      '热锅下油，放入花生米小火炸香盛出',
      '锅中余油爆香花椒和干辣椒',
      '放入鸡丁滑炒至变色',
      '倒入调好的酱汁翻炒均匀',
      '最后加入花生米和葱段翻炒出锅',
    ],
  },
  {
    id: 6,
    name: '鱼香肉丝',
    emoji: '🐟',
    description: '咸甜酸辣兼备，葱姜蒜香浓郁',
    ingredients: [
      { name: '猪里脊肉', amount: '300g' },
      { name: '胡萝卜', amount: '1根' },
      { name: '木耳', amount: '1把' },
      { name: '青椒', amount: '1个' },
      { name: '郫县豆瓣酱', amount: '1勺' },
      { name: '蒜末', amount: '适量' },
      { name: '姜末', amount: '适量' },
      { name: '葱花', amount: '适量' },
      { name: '醋', amount: '2勺' },
      { name: '糖', amount: '2勺' },
      { name: '生抽', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      '猪里脊切丝，用生抽和淀粉腌制',
      '胡萝卜、木耳、青椒切丝备用',
      '调鱼香汁：醋、糖、生抽、淀粉、少许水',
      '热锅下油，炒香豆瓣酱出红油',
      '加入蒜末、姜末爆香',
      '放入肉丝滑炒至变色',
      '加入蔬菜丝翻炒至断生',
      '倒入鱼香汁翻炒收汁，撒葱花出锅',
    ],
  },
  {
    id: 7,
    name: '麻婆豆腐',
    emoji: '🌶️',
    description: '麻辣鲜香，嫩滑入味的川菜代表',
    ingredients: [
      { name: '嫩豆腐', amount: '1盒' },
      { name: '猪肉末', amount: '100g' },
      { name: '郫县豆瓣酱', amount: '1勺' },
      { name: '花椒粉', amount: '1勺' },
      { name: '蒜末', amount: '适量' },
      { name: '葱花', amount: '适量' },
      { name: '生抽', amount: '1勺' },
      { name: '淀粉', amount: '适量' },
    ],
    steps: [
      '豆腐切小块，用盐水焯烫后捞出',
      '热锅下油，炒香肉末盛出',
      '锅中余油炒香豆瓣酱和蒜末出红油',
      '加入适量水烧开，放入豆腐',
      '加生抽调味，小火焖3分钟',
      '淀粉水勾芡，让汤汁浓稠',
      '撒上肉末、花椒粉和葱花即可',
    ],
  },
  {
    id: 8,
    name: '糖醋里脊',
    emoji: '🍬',
    description: '外酥里嫩，酸甜可口的经典佳肴',
    ingredients: [
      { name: '猪里脊肉', amount: '300g' },
      { name: '番茄酱', amount: '3勺' },
      { name: '白醋', amount: '2勺' },
      { name: '白糖', amount: '3勺' },
      { name: '淀粉', amount: '适量' },
      { name: '鸡蛋', amount: '1个' },
      { name: '料酒', amount: '1勺' },
    ],
    steps: [
      '里脊切条，用料酒、盐、蛋清腌制',
      '裹上干淀粉，静置10分钟返潮',
      '调糖醋汁：番茄酱、白醋、白糖、少许水和淀粉',
      '油烧至六成热，下里脊炸至微黄捞出',
      '油温升至八成热，复炸至金黄酥脆',
      '锅中留少许油，倒入糖醋汁熬至粘稠',
      '放入炸好的里脊快速翻炒均匀出锅',
    ],
  },
  {
    id: 9,
    name: '炒时蔬',
    emoji: '🥬',
    description: '简单快手，保留蔬菜鲜甜原味',
    ingredients: [
      { name: '小白菜', amount: '1把' },
      { name: '蒜末', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '蚝油', amount: '1勺' },
    ],
    steps: [
      '小白菜洗净切段',
      '热锅下油，爆香蒜末',
      '放入小白菜大火快炒',
      '加盐和蚝油调味，炒至断生即可',
    ],
  },
  {
    id: 10,
    name: '可乐鸡翅',
    emoji: '🍗',
    description: '甜香浓郁，小孩最爱的家常做法',
    ingredients: [
      { name: '鸡翅', amount: '8个' },
      { name: '可乐', amount: '1罐' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '半勺' },
      { name: '料酒', amount: '1勺' },
      { name: '姜片', amount: '3片' },
      { name: '葱段', amount: '适量' },
    ],
    steps: [
      '鸡翅两面划刀，便于入味',
      '冷水下锅加料酒焯水去腥',
      '鸡翅沥干后，热锅煎至两面金黄',
      '加入姜片、葱段爆香',
      '倒入可乐，加生抽和老抽',
      '大火烧开转中小火炖15分钟',
      '大火收汁至浓稠即可',
    ],
  },
  {
    id: 11,
    name: '葱油拌面',
    emoji: '🍜',
    description: '葱香扑鼻，简单却回味无穷',
    ingredients: [
      { name: '面条', amount: '200g' },
      { name: '小葱', amount: '1大把' },
      { name: '生抽', amount: '3勺' },
      { name: '老抽', amount: '1勺' },
      { name: '糖', amount: '1勺' },
      { name: '食用油', amount: '适量' },
    ],
    steps: [
      '小葱洗净切段，葱白葱绿分开',
      '调酱汁：生抽、老抽、糖混合',
      '锅中多放油，小火慢炸葱白至焦黄',
      '加入葱绿继续炸至干香',
      '倒入调好的酱汁，小火熬至冒泡关火',
      '另起锅煮面条，捞出沥干',
      '淋上葱油酱汁拌匀即可',
    ],
  },
  {
    id: 12,
    name: '紫菜蛋花汤',
    emoji: '🍲',
    description: '清淡鲜美，5分钟快手汤品',
    ingredients: [
      { name: '紫菜', amount: '1片' },
      { name: '鸡蛋', amount: '2个' },
      { name: '虾皮', amount: '1勺' },
      { name: '葱花', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '香油', amount: '几滴' },
    ],
    steps: [
      '鸡蛋打散备用',
      '锅中加水烧开，放入虾皮煮出鲜味',
      '放入紫菜煮软',
      '慢慢倒入蛋液，形成蛋花',
      '加盐调味，撒上葱花',
      '滴几滴香油即可出锅',
    ],
  },
];

const app = express();
app.use(cors());
app.use(express.json());

const getAllIngredients = (): string[] => {
  const ingredients = new Set<string>();
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      ingredients.add(ing.name);
    });
  });
  return Array.from(ingredients);
};

app.get('/api/recipes', (_req, res) => {
  res.json({ recipes, allIngredients: getAllIngredients() });
});

app.post('/api/recommend', (req, res) => {
  const { ingredients } = req.body as { ingredients: string[] };
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Invalid ingredients' });
  }

  const userIngredients = ingredients.map((i) => i.trim());

  const scored = recipes.map((recipe) => {
    const total = recipe.ingredients.length;
    let matched = 0;
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];

    recipe.ingredients.forEach((ing) => {
      const isMatch = userIngredients.some(
        (userIng) =>
          userIng === ing.name ||
          userIng.toLowerCase() === ing.name.toLowerCase()
      );
      if (isMatch) {
        matched++;
        matchedIngredients.push(ing.name);
      } else {
        missingIngredients.push(ing.name);
      }
    });

    const score = total > 0 ? Math.round((matched / total) * 100) : 0;

    return {
      ...recipe,
      matchScore: score,
      matchedIngredients,
      missingIngredients,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  res.json({ recommendations: scored });
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Recipe server running on http://localhost:${PORT}`);
});
