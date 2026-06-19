import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../../data/recipes.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      servings INTEGER DEFAULT 2,
      prep_time INTEGER DEFAULT 0,
      cook_time INTEGER DEFAULT 0,
      total_time INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL DEFAULT 0,
      unit TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      rating INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, recipe_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_key TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (username, email, password, avatar, bio) VALUES (?, ?, ?, ?, ?)'
  );
  const insertRecipe = db.prepare(
    'INSERT INTO recipes (user_id, title, description, thumbnail, servings, prep_time, cook_time, total_time, tags, likes, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (recipe_id, name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertStep = db.prepare(
    'INSERT INTO steps (recipe_id, title, description, image, sort_order) VALUES (?, ?, ?, ?, ?)'
  );

  const demoUserId = insertUser.run(
    '美食达人',
    'demo@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '',
    '热爱烹饪，喜欢分享家常菜'
  ).lastInsertRowid as number;

  const recipes = [
    {
      title: '番茄炒蛋',
      description: '经典家常菜，酸甜可口，简单易做',
      thumbnail: '',
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      tags: '中式,家常菜,快手菜',
      likes: 128,
      views: 520,
      ingredients: [
        { name: '番茄', amount: 2, unit: '个' },
        { name: '鸡蛋', amount: 3, unit: '个' },
        { name: '葱花', amount: 10, unit: '克' },
        { name: '盐', amount: 3, unit: '克' },
        { name: '白糖', amount: 5, unit: '克' },
      ],
      steps: [
        { title: '准备食材', description: '番茄洗净切块，鸡蛋打散加少许盐搅匀' },
        { title: '炒鸡蛋', description: '热锅冷油，倒入蛋液，炒至凝固盛出' },
        { title: '炒番茄', description: '锅中再加少许油，放入番茄翻炒出汁' },
        { title: '混合翻炒', description: '加入炒好的鸡蛋，加白糖和盐调味，撒葱花出锅' },
      ],
    },
    {
      title: '红烧肉',
      description: '肥而不腻，入口即化的经典红烧肉',
      thumbnail: '',
      servings: 4,
      prepTime: 20,
      cookTime: 90,
      tags: '中式,硬菜,下饭',
      likes: 256,
      views: 1080,
      ingredients: [
        { name: '五花肉', amount: 500, unit: '克' },
        { name: '冰糖', amount: 30, unit: '克' },
        { name: '生抽', amount: 2, unit: '勺' },
        { name: '老抽', amount: 1, unit: '勺' },
        { name: '料酒', amount: 2, unit: '勺' },
        { name: '八角', amount: 2, unit: '个' },
        { name: '桂皮', amount: 1, unit: '段' },
      ],
      steps: [
        { title: '处理肉', description: '五花肉切块，冷水下锅焯水去血沫' },
        { title: '炒糖色', description: '锅中放油和冰糖，小火炒出糖色' },
        { title: '煸炒', description: '放入五花肉翻炒上色，加葱姜八角桂皮' },
        { title: '炖煮', description: '加料酒、生抽、老抽、开水，小火炖60分钟' },
        { title: '收汁', description: '大火收汁，汤汁浓稠即可出锅' },
      ],
    },
    {
      title: '提拉米苏',
      description: '意式经典甜品，咖啡与马斯卡彭的完美结合',
      thumbnail: '',
      servings: 6,
      prepTime: 30,
      cookTime: 0,
      tags: '甜品,西式,烘焙',
      likes: 189,
      views: 760,
      ingredients: [
        { name: '马斯卡彭奶酪', amount: 250, unit: '克' },
        { name: '手指饼干', amount: 200, unit: '克' },
        { name: '浓缩咖啡', amount: 200, unit: '毫升' },
        { name: '淡奶油', amount: 150, unit: '毫升' },
        { name: '蛋黄', amount: 3, unit: '个' },
        { name: '糖粉', amount: 50, unit: '克' },
        { name: '可可粉', amount: 10, unit: '克' },
      ],
      steps: [
        { title: '准备', description: '浓缩咖啡冷却备用，蛋黄加糖粉打发' },
        { title: '奶酪糊', description: '马斯卡彭奶酪搅匀，加入蛋黄糊混合' },
        { title: '打发奶油', description: '淡奶油打至六分发，拌入奶酪糊' },
        { title: '组装', description: '手指饼干快速蘸咖啡，铺一层抹奶酪糊，重复两层' },
        { title: '冷藏', description: '冰箱冷藏4小时以上，吃前筛可可粉' },
      ],
    },
    {
      title: '酸辣土豆丝',
      description: '爽脆开胃，简单快手的家常菜',
      thumbnail: '',
      servings: 2,
      prepTime: 10,
      cookTime: 8,
      tags: '中式,素菜,快手菜',
      likes: 156,
      views: 680,
      ingredients: [
        { name: '土豆', amount: 2, unit: '个' },
        { name: '干辣椒', amount: 5, unit: '个' },
        { name: '花椒', amount: 1, unit: '勺' },
        { name: '白醋', amount: 2, unit: '勺' },
        { name: '盐', amount: 3, unit: '克' },
      ],
      steps: [
        { title: '切土豆丝', description: '土豆去皮切丝，清水浸泡去淀粉' },
        { title: '爆香', description: '热锅冷油，爆香花椒和干辣椒' },
        { title: '翻炒', description: '捞出土豆丝沥干，下锅大火快炒' },
        { title: '调味', description: '加白醋和盐，翻炒均匀出锅' },
      ],
    },
  ];

  recipes.forEach((recipe, index) => {
    const recipeId = insertRecipe.run(
      demoUserId,
      recipe.title,
      recipe.description,
      recipe.thumbnail,
      recipe.servings,
      recipe.prepTime,
      recipe.cookTime,
      recipe.prepTime + recipe.cookTime,
      recipe.tags,
      recipe.likes,
      recipe.views
    ).lastInsertRowid as number;

    recipe.ingredients.forEach((ing, i) => {
      insertIngredient.run(recipeId, ing.name, ing.amount, ing.unit, i);
    });

    recipe.steps.forEach((step, i) => {
      insertStep.run(recipeId, step.title, step.description, '', i);
    });
  });
}

export function query(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql);
  return stmt.get(...params) || null;
}

export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid as number };
}

export default db;
