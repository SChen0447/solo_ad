import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '..', 'recipe.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      unit TEXT DEFAULT 'g'
    );

    CREATE TABLE IF NOT EXISTS user_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL DEFAULT 1,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      UNIQUE(user_id, ingredient_id)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cook_time INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      steps TEXT NOT NULL,
      servings INTEGER DEFAULT 1,
      calories_per_serving REAL DEFAULT 0,
      protein_per_serving REAL DEFAULT 0,
      carbs_per_serving REAL DEFAULT 0,
      fat_per_serving REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'g',
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      recipe_id INTEGER,
      meal_type TEXT NOT NULL,
      date TEXT NOT NULL,
      servings REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const ingredientCount = db.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
  if (ingredientCount.count === 0) {
    seedIngredients();
    seedRecipes();
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run('default-user', '默认用户');
  }
}

const presetIngredients = [
  { name: '鸡蛋', icon: '🥚', color: '#FFF3CD', calories: 155, protein: 13, carbs: 1.1, fat: 11, unit: '个' },
  { name: '鸡胸肉', icon: '🍗', color: '#FFE0B2', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g' },
  { name: '西兰花', icon: '🥦', color: '#C8E6C9', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: 'g' },
  { name: '大米', icon: '🍚', color: '#FFF8E1', calories: 365, protein: 7, carbs: 79, fat: 0.7, unit: 'g' },
  { name: '牛奶', icon: '🥛', color: '#E3F2FD', calories: 42, protein: 3.4, carbs: 5, fat: 1, unit: 'ml' },
  { name: '番茄', icon: '🍅', color: '#FFCDD2', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: 'g' },
  { name: '土豆', icon: '🥔', color: '#FFE0B2', calories: 77, protein: 2, carbs: 17, fat: 0.1, unit: 'g' },
  { name: '胡萝卜', icon: '🥕', color: '#FFE0B2', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, unit: 'g' },
  { name: '洋葱', icon: '🧅', color: '#F3E5F5', calories: 40, protein: 1.1, carbs: 9, fat: 0.1, unit: 'g' },
  { name: '大蒜', icon: '🧄', color: '#F5F5F5', calories: 149, protein: 6.4, carbs: 33, fat: 0.5, unit: 'g' },
  { name: '牛肉', icon: '🥩', color: '#FFCDD2', calories: 250, protein: 26, carbs: 0, fat: 15, unit: 'g' },
  { name: '猪肉', icon: '🥓', color: '#FFCCBC', calories: 242, protein: 27, carbs: 0, fat: 14, unit: 'g' },
  { name: '虾仁', icon: '🦐', color: '#FFCCBC', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, unit: 'g' },
  { name: '三文鱼', icon: '🐟', color: '#FFAB91', calories: 208, protein: 20, carbs: 0, fat: 13, unit: 'g' },
  { name: '豆腐', icon: '🧈', color: '#FFF9C4', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, unit: 'g' },
  { name: '菠菜', icon: '🥬', color: '#C5E1A5', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: 'g' },
  { name: '生菜', icon: '🥗', color: '#DCEDC8', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, unit: 'g' },
  { name: '黄瓜', icon: '🥒', color: '#C8E6C9', calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, unit: 'g' },
  { name: '青椒', icon: '🫑', color: '#C5E1A5', calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, unit: 'g' },
  { name: '蘑菇', icon: '🍄', color: '#E0E0E0', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, unit: 'g' },
  { name: '面条', icon: '🍜', color: '#FFF3E0', calories: 138, protein: 4.5, carbs: 25, fat: 2.1, unit: 'g' },
  { name: '面包', icon: '🍞', color: '#FFE0B2', calories: 265, protein: 9, carbs: 49, fat: 3.2, unit: 'g' },
  { name: '黄油', icon: '🧈', color: '#FFF59D', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unit: 'g' },
  { name: '奶酪', icon: '🧀', color: '#FFF59D', calories: 402, protein: 25, carbs: 1.3, fat: 33, unit: 'g' },
  { name: '酸奶', icon: '🥛', color: '#FCE4EC', calories: 59, protein: 10, carbs: 3.6, fat: 0.7, unit: 'g' },
  { name: '苹果', icon: '🍎', color: '#FFCDD2', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: 'g' },
  { name: '香蕉', icon: '🍌', color: '#FFF59D', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: 'g' },
  { name: '草莓', icon: '🍓', color: '#F8BBD0', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, unit: 'g' },
  { name: '葡萄', icon: '🍇', color: '#E1BEE7', calories: 69, protein: 0.7, carbs: 18, fat: 0.2, unit: 'g' },
  { name: '橙子', icon: '🍊', color: '#FFE0B2', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, unit: 'g' },
  { name: '橄榄油', icon: '🫒', color: '#D7CCC8', calories: 884, protein: 0, carbs: 0, fat: 100, unit: 'ml' },
  { name: '酱油', icon: '🫗', color: '#BCAAA4', calories: 53, protein: 8, carbs: 4, fat: 0.1, unit: 'ml' },
  { name: '盐', icon: '🧂', color: '#FAFAFA', calories: 0, protein: 0, carbs: 0, fat: 0, unit: 'g' },
  { name: '糖', icon: '🍬', color: '#FFFDE7', calories: 387, protein: 0, carbs: 100, fat: 0, unit: 'g' },
  { name: '醋', icon: '🍶', color: '#F0F4C3', calories: 21, protein: 0.3, carbs: 5.5, fat: 0, unit: 'ml' },
  { name: '料酒', icon: '🍶', color: '#D7CCC8', calories: 93, protein: 0.2, carbs: 1.2, fat: 0, unit: 'ml' },
  { name: '辣椒', icon: '🌶️', color: '#EF9A9A', calories: 40, protein: 1.9, carbs: 8.8, fat: 0.4, unit: 'g' },
  { name: '姜', icon: '🫚', color: '#FFCC80', calories: 80, protein: 2, carbs: 18, fat: 0.8, unit: 'g' },
  { name: '葱', icon: '🧅', color: '#DCEDC8', calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2, unit: 'g' },
  { name: '香菜', icon: '🌿', color: '#A5D6A7', calories: 21, protein: 2.1, carbs: 3.7, fat: 0.5, unit: 'g' },
  { name: '紫菜', icon: '🌊', color: '#90A4AE', calories: 306, protein: 26, carbs: 44, fat: 1.1, unit: 'g' },
  { name: '海带', icon: '🌿', color: '#B2DFDB', calories: 43, protein: 1.1, carbs: 8.4, fat: 0.6, unit: 'g' },
  { name: '木耳', icon: '🍄', color: '#9E9E9E', calories: 265, protein: 10, carbs: 65, fat: 0.4, unit: 'g' },
  { name: '花生', icon: '🥜', color: '#FFCC80', calories: 567, protein: 25, carbs: 16, fat: 49, unit: 'g' },
  { name: '核桃', icon: '🥜', color: '#D7CCC8', calories: 654, protein: 15, carbs: 14, fat: 65, unit: 'g' },
  { name: '芝麻', icon: '🥜', color: '#EFEBE9', calories: 573, protein: 21, carbs: 23, fat: 50, unit: 'g' },
  { name: '蜂蜜', icon: '🍯', color: '#FFE082', calories: 304, protein: 0.3, carbs: 83, fat: 0, unit: 'g' },
  { name: '巧克力', icon: '🍫', color: '#8D6E63', calories: 546, protein: 4.9, carbs: 61, fat: 31, unit: 'g' },
  { name: '咖啡豆', icon: '☕', color: '#6D4C41', calories: 2, protein: 0.1, carbs: 0, fat: 0, unit: 'g' },
  { name: '茶叶', icon: '🍵', color: '#A5D6A7', calories: 1, protein: 0, carbs: 0, fat: 0, unit: 'g' },
];

function seedIngredients() {
  const stmt = db.prepare(`
    INSERT INTO ingredients (name, icon, color, calories, protein, carbs, fat, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((ingredients: typeof presetIngredients) => {
    for (const ing of ingredients) {
      stmt.run(ing.name, ing.icon, ing.color, ing.calories, ing.protein, ing.carbs, ing.fat, ing.unit);
    }
  });
  insertMany(presetIngredients);
}

const recipes = [
  {
    name: '番茄炒蛋',
    cookTime: 15,
    difficulty: 1,
    servings: 2,
    nutrition: { calories: 250, protein: 18, carbs: 8, fat: 16 },
    ingredients: [
      { name: '鸡蛋', quantity: 3, unit: '个' },
      { name: '番茄', quantity: 200, unit: 'g' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '糖', quantity: 5, unit: 'g' },
      { name: '橄榄油', quantity: 10, unit: 'ml' },
    ],
    steps: [
      '鸡蛋打入碗中，加少许盐搅拌均匀',
      '番茄洗净切块，葱切葱花',
      '热锅倒油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入盐和糖调味',
      '倒入炒好的鸡蛋翻炒均匀',
      '撒上葱花出锅',
    ],
  },
  {
    name: '香煎鸡胸肉配西兰花',
    cookTime: 25,
    difficulty: 2,
    servings: 1,
    nutrition: { calories: 380, protein: 42, carbs: 12, fat: 18 },
    ingredients: [
      { name: '鸡胸肉', quantity: 200, unit: 'g' },
      { name: '西兰花', quantity: 150, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '黑胡椒', quantity: 1, unit: 'g' },
      { name: '柠檬', quantity: 1, unit: '个' },
    ],
    steps: [
      '鸡胸肉用厨房纸吸干水分，两面撒盐和黑胡椒腌制15分钟',
      '西兰花切小朵，洗净沥干',
      '大蒜切末',
      '热锅倒油，放入鸡胸肉中小火煎至两面金黄，每面约5分钟',
      '鸡胸肉盛出，锅中加入西兰花翻炒2分钟',
      '加入蒜末炒香，加少许盐调味',
      '鸡胸肉切片，和西兰花一起装盘，挤上柠檬汁',
    ],
  },
  {
    name: '番茄牛肉意面',
    cookTime: 35,
    difficulty: 3,
    servings: 2,
    nutrition: { calories: 520, protein: 28, carbs: 65, fat: 16 },
    ingredients: [
      { name: '面条', quantity: 200, unit: 'g' },
      { name: '牛肉', quantity: 150, unit: 'g' },
      { name: '番茄', quantity: 200, unit: 'g' },
      { name: '洋葱', quantity: 50, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
      { name: '盐', quantity: 3, unit: 'g' },
      { name: '黑胡椒', quantity: 1, unit: 'g' },
    ],
    steps: [
      '牛肉剁成肉末，番茄切丁，洋葱和大蒜切末',
      '锅中加水煮沸，加盐，放入意面煮至八成熟',
      '另起锅倒油，炒香洋葱和蒜末',
      '加入牛肉末炒至变色',
      '加入番茄丁炒出汁，加盐和黑胡椒调味',
      '小火慢炖10分钟成肉酱',
      '将煮好的意面倒入肉酱中翻拌均匀',
      '撒上帕玛森芝士即可',
    ],
  },
  {
    name: '土豆烧牛肉',
    cookTime: 60,
    difficulty: 3,
    servings: 4,
    nutrition: { calories: 450, protein: 35, carbs: 28, fat: 22 },
    ingredients: [
      { name: '牛肉', quantity: 400, unit: 'g' },
      { name: '土豆', quantity: 300, unit: 'g' },
      { name: '胡萝卜', quantity: 100, unit: 'g' },
      { name: '洋葱', quantity: 50, unit: 'g' },
      { name: '大蒜', quantity: 5, unit: 'g' },
      { name: '姜', quantity: 5, unit: 'g' },
      { name: '酱油', quantity: 20, unit: 'ml' },
      { name: '料酒', quantity: 15, unit: 'ml' },
      { name: '糖', quantity: 5, unit: 'g' },
    ],
    steps: [
      '牛肉切块，冷水下锅焯水去腥',
      '土豆和胡萝卜切滚刀块',
      '洋葱切片，姜切片，大蒜整粒',
      '热锅倒油，炒香姜片和大蒜',
      '加入牛肉块翻炒上色',
      '加料酒、酱油、糖调味',
      '加开水没过牛肉，大火烧开转小火炖40分钟',
      '加入土豆和胡萝卜继续炖15分钟',
      '大火收汁即可',
    ],
  },
  {
    name: '蒜蓉西兰花',
    cookTime: 10,
    difficulty: 1,
    servings: 2,
    nutrition: { calories: 80, protein: 5, carbs: 8, fat: 4 },
    ingredients: [
      { name: '西兰花', quantity: 300, unit: 'g' },
      { name: '大蒜', quantity: 5, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '橄榄油', quantity: 10, unit: 'ml' },
    ],
    steps: [
      '西兰花切小朵，洗净沥干',
      '大蒜切末',
      '热锅倒油，小火炒香蒜末',
      '加入西兰花大火快炒2分钟',
      '加盐调味，翻炒均匀出锅',
    ],
  },
  {
    name: '红烧豆腐',
    cookTime: 20,
    difficulty: 2,
    servings: 2,
    nutrition: { calories: 200, protein: 15, carbs: 10, fat: 12 },
    ingredients: [
      { name: '豆腐', quantity: 300, unit: 'g' },
      { name: '酱油', quantity: 15, unit: 'ml' },
      { name: '糖', quantity: 5, unit: 'g' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
    ],
    steps: [
      '豆腐切小块，用厨房纸吸干水分',
      '葱切葱花，大蒜切末',
      '热锅倒油，放入豆腐煎至两面金黄',
      '加入蒜末炒香',
      '加入酱油和糖，加少许水',
      '小火炖5分钟让豆腐入味',
      '大火收汁，撒上葱花出锅',
    ],
  },
  {
    name: '蛋炒饭',
    cookTime: 15,
    difficulty: 2,
    servings: 1,
    nutrition: { calories: 480, protein: 15, carbs: 65, fat: 18 },
    ingredients: [
      { name: '大米', quantity: 200, unit: 'g' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '酱油', quantity: 5, unit: 'ml' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
    ],
    steps: [
      '鸡蛋打散，葱切葱花',
      '米饭提前煮好放凉',
      '热锅倒油，倒入蛋液炒散',
      '加入米饭大火翻炒均匀',
      '加入盐和酱油调味',
      '翻炒至米饭粒粒分明',
      '撒上葱花出锅',
    ],
  },
  {
    name: '清炒时蔬',
    cookTime: 10,
    difficulty: 1,
    servings: 2,
    nutrition: { calories: 90, protein: 3, carbs: 10, fat: 5 },
    ingredients: [
      { name: '菠菜', quantity: 200, unit: 'g' },
      { name: '蘑菇', quantity: 100, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '橄榄油', quantity: 10, unit: 'ml' },
    ],
    steps: [
      '菠菜洗净切段，蘑菇切片',
      '大蒜切末',
      '热锅倒油，炒香蒜末',
      '加入蘑菇片炒软',
      '加入菠菜大火快炒1分钟',
      '加盐调味出锅',
    ],
  },
  {
    name: '三文鱼沙拉',
    cookTime: 15,
    difficulty: 2,
    servings: 1,
    nutrition: { calories: 350, protein: 28, carbs: 8, fat: 22 },
    ingredients: [
      { name: '三文鱼', quantity: 150, unit: 'g' },
      { name: '生菜', quantity: 100, unit: 'g' },
      { name: '番茄', quantity: 50, unit: 'g' },
      { name: '黄瓜', quantity: 50, unit: 'g' },
      { name: '柠檬', quantity: 1, unit: '个' },
      { name: '橄榄油', quantity: 10, unit: 'ml' },
      { name: '盐', quantity: 1, unit: 'g' },
      { name: '黑胡椒', quantity: 1, unit: 'g' },
    ],
    steps: [
      '三文鱼用盐和黑胡椒腌制10分钟',
      '生菜撕成片，番茄切块，黄瓜切片',
      '蔬菜铺在盘底',
      '热锅倒少许油，放入三文鱼煎至两面微焦',
      '三文鱼放在蔬菜上',
      '淋上橄榄油和柠檬汁',
      '撒少许黑胡椒即可',
    ],
  },
  {
    name: '麻婆豆腐',
    cookTime: 25,
    difficulty: 3,
    servings: 2,
    nutrition: { calories: 280, protein: 18, carbs: 12, fat: 18 },
    ingredients: [
      { name: '豆腐', quantity: 300, unit: 'g' },
      { name: '猪肉', quantity: 100, unit: 'g' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '姜', quantity: 3, unit: 'g' },
      { name: '辣椒', quantity: 5, unit: 'g' },
      { name: '酱油', quantity: 10, unit: 'ml' },
      { name: '糖', quantity: 3, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
    ],
    steps: [
      '豆腐切小块，开水焯烫后捞出',
      '猪肉剁成肉末',
      '葱姜蒜切末，辣椒切碎',
      '热锅倒油，炒香肉末',
      '加入葱姜蒜和辣椒炒香',
      '加酱油和糖，加少许水',
      '放入豆腐轻轻推动',
      '小火炖5分钟入味',
      '勾芡后撒葱花出锅',
    ],
  },
  {
    name: '紫菜蛋花汤',
    cookTime: 10,
    difficulty: 1,
    servings: 2,
    nutrition: { calories: 80, protein: 8, carbs: 5, fat: 3 },
    ingredients: [
      { name: '紫菜', quantity: 5, unit: 'g' },
      { name: '鸡蛋', quantity: 1, unit: '个' },
      { name: '葱', quantity: 3, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '香油', quantity: 3, unit: 'ml' },
    ],
    steps: [
      '紫菜撕成碎片，鸡蛋打散',
      '葱切葱花',
      '锅中加水烧开',
      '放入紫菜煮2分钟',
      '淋入蛋液形成蛋花',
      '加盐调味',
      '撒葱花，滴香油出锅',
    ],
  },
  {
    name: '青椒炒肉丝',
    cookTime: 20,
    difficulty: 2,
    servings: 2,
    nutrition: { calories: 220, protein: 25, carbs: 6, fat: 10 },
    ingredients: [
      { name: '猪肉', quantity: 200, unit: 'g' },
      { name: '青椒', quantity: 150, unit: 'g' },
      { name: '大蒜', quantity: 3, unit: 'g' },
      { name: '酱油', quantity: 10, unit: 'ml' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
      { name: '淀粉', quantity: 5, unit: 'g' },
    ],
    steps: [
      '猪肉切丝，加酱油和淀粉腌制10分钟',
      '青椒去籽切丝',
      '大蒜切末',
      '热锅倒油，滑炒肉丝至变色盛出',
      '锅中再加少许油，炒香蒜末',
      '加入青椒丝炒至断生',
      '倒入肉丝翻炒均匀',
      '加盐调味出锅',
    ],
  },
  {
    name: '牛奶燕麦粥',
    cookTime: 10,
    difficulty: 1,
    servings: 1,
    nutrition: { calories: 320, protein: 15, carbs: 45, fat: 8 },
    ingredients: [
      { name: '牛奶', quantity: 250, unit: 'ml' },
      { name: '燕麦片', quantity: 50, unit: 'g' },
      { name: '香蕉', quantity: 50, unit: 'g' },
      { name: '蜂蜜', quantity: 10, unit: 'g' },
    ],
    steps: [
      '牛奶倒入锅中加热',
      '加入燕麦片小火煮5分钟',
      '期间不断搅拌至浓稠',
      '香蕉切片',
      '燕麦粥盛入碗中',
      '铺上香蕉片',
      '淋上蜂蜜即可',
    ],
  },
  {
    name: '虾仁滑蛋',
    cookTime: 15,
    difficulty: 2,
    servings: 2,
    nutrition: { calories: 260, protein: 30, carbs: 3, fat: 14 },
    ingredients: [
      { name: '虾仁', quantity: 150, unit: 'g' },
      { name: '鸡蛋', quantity: 3, unit: '个' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '橄榄油', quantity: 15, unit: 'ml' },
    ],
    steps: [
      '虾仁去虾线，加少许盐腌制',
      '鸡蛋打散，加少许盐',
      '葱切葱花',
      '热锅倒油，炒香虾仁',
      '倒入蛋液',
      '小火慢慢推动蛋液至半凝固',
      '撒上葱花出锅',
    ],
  },
  {
    name: '西红柿鸡蛋面',
    cookTime: 20,
    difficulty: 2,
    servings: 1,
    nutrition: { calories: 450, protein: 18, carbs: 65, fat: 12 },
    ingredients: [
      { name: '面条', quantity: 150, unit: 'g' },
      { name: '番茄', quantity: 150, unit: 'g' },
      { name: '鸡蛋', quantity: 1, unit: '个' },
      { name: '葱', quantity: 5, unit: 'g' },
      { name: '盐', quantity: 2, unit: 'g' },
      { name: '橄榄油', quantity: 10, unit: 'ml' },
    ],
    steps: [
      '番茄切块，鸡蛋打散',
      '葱切葱花',
      '热锅倒油，炒散鸡蛋盛出',
      '锅中加番茄炒出汁',
      '加水烧开',
      '放入面条煮熟',
      '加盐调味',
      '倒入鸡蛋液形成蛋花',
      '撒葱花出锅',
    ],
  },
];

function seedRecipes() {
  const insertRecipe = db.prepare(`
    INSERT INTO recipes (name, cook_time, difficulty, steps, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecipeIngredient = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
    VALUES (?, ?, ?, ?)
  `);

  const getIngredientId = db.prepare('SELECT id FROM ingredients WHERE name = ?');

  const seed = db.transaction(() => {
    for (const recipe of recipes) {
      const stepsJson = JSON.stringify(recipe.steps);
      const result = insertRecipe.run(
        recipe.name,
        recipe.cookTime,
        recipe.difficulty,
        stepsJson,
        recipe.servings,
        recipe.nutrition.calories,
        recipe.nutrition.protein,
        recipe.nutrition.carbs,
        recipe.nutrition.fat
      );

      const recipeId = result.lastInsertRowid as number;

      for (const ing of recipe.ingredients) {
        const ingRow = getIngredientId.get(ing.name) as { id: number } | undefined;
        if (ingRow) {
          insertRecipeIngredient.run(recipeId, ingRow.id, ing.quantity, ing.unit);
        }
      }
    }
  });

  seed();
}

export function getAllIngredients() {
  return db.prepare('SELECT * FROM ingredients ORDER BY name').all();
}

export function getUserIngredients(userId: string) {
  return db.prepare(`
    SELECT i.*, ui.id as user_ingredient_id, ui.quantity, ui.added_at
    FROM user_ingredients ui
    JOIN ingredients i ON ui.ingredient_id = i.id
    WHERE ui.user_id = ?
    ORDER BY ui.added_at DESC
  `).all(userId);
}

export function addUserIngredient(userId: string, ingredientId: number) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user_ingredients (user_id, ingredient_id, quantity)
    VALUES (?, ?, 1)
  `);
  return stmt.run(userId, ingredientId);
}

export function removeUserIngredient(userId: string, ingredientId: number) {
  return db.prepare(`
    DELETE FROM user_ingredients WHERE user_id = ? AND ingredient_id = ?
  `).run(userId, ingredientId);
}

export function resetUserIngredients(userId: string) {
  return db.prepare('DELETE FROM user_ingredients WHERE user_id = ?').run(userId);
}

export function getRecommendedRecipes(ingredientIds: number[], limit: number = 3) {
  if (ingredientIds.length === 0) return [];

  const placeholders = ingredientIds.map(() => '?').join(',');

  const recipes = db.prepare(`
    SELECT 
      r.*,
      JSON_GROUP_ARRAY(JSON_OBJECT(
        'id', ri.id,
        'ingredient_id', ri.ingredient_id,
        'ingredient_name', i.name,
        'ingredient_icon', i.icon,
        'ingredient_color', i.color,
        'quantity', ri.quantity,
        'unit', ri.unit,
        'is_available', CASE WHEN ri.ingredient_id IN (${placeholders}) THEN 1 ELSE 0 END
      )) as ingredients_json,
      (SELECT COUNT(*) FROM recipe_ingredients ri2 WHERE ri2.recipe_id = r.id) as total_ingredients,
      (SELECT COUNT(*) FROM recipe_ingredients ri2 WHERE ri2.recipe_id = r.id AND ri2.ingredient_id IN (${placeholders})) as matched_ingredients
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE r.id IN (
      SELECT r2.id
      FROM recipes r2
      JOIN recipe_ingredients ri3 ON r2.id = ri3.recipe_id
      WHERE ri3.ingredient_id IN (${placeholders})
      GROUP BY r2.id
      HAVING CAST(COUNT(DISTINCT ri3.ingredient_id) AS REAL) / (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r2.id) >= 0.5
    )
    GROUP BY r.id
    ORDER BY CAST(matched_ingredients AS REAL) / total_ingredients DESC, r.difficulty ASC
    LIMIT ?
  `).all(...ingredientIds, ...ingredientIds, ...ingredientIds, limit);

  return recipes.map((r: any) => ({
    ...r,
    steps: JSON.parse(r.steps),
    ingredients: JSON.parse(r.ingredients_json),
    match_ratio: r.matched_ingredients / r.total_ingredients,
  }));
}

export function addMealLog(
  id: string,
  userId: string,
  recipeId: number | null,
  mealType: string,
  date: string,
  servings: number,
  calories: number,
  protein: number,
  carbs: number,
  fat: number
) {
  return db.prepare(`
    INSERT INTO meal_logs (id, user_id, recipe_id, meal_type, date, servings, calories, protein, carbs, fat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, recipeId, mealType, date, servings, calories, protein, carbs, fat);
}

export function getMealLogs(userId: string, startDate: string, endDate: string) {
  return db.prepare(`
    SELECT * FROM meal_logs
    WHERE user_id = ? AND date BETWEEN ? AND ?
    ORDER BY date, created_at
  `).all(userId, startDate, endDate);
}

export function getDailyNutritionSummary(userId: string, startDate: string, endDate: string) {
  return db.prepare(`
    SELECT 
      date,
      SUM(calories) as total_calories,
      SUM(protein) as total_protein,
      SUM(carbs) as total_carbs,
      SUM(fat) as total_fat
    FROM meal_logs
    WHERE user_id = ? AND date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(userId, startDate, endDate);
}

export function getRecipeById(id: number) {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!recipe) return null;

  const ingredients = db.prepare(`
    SELECT ri.*, i.name as ingredient_name, i.icon as ingredient_icon, i.color as ingredient_color
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = ?
    ORDER BY ri.id
  `).all(id);

  return {
    ...recipe,
    steps: JSON.parse(recipe.steps),
    ingredients,
  };
}

export default db;
