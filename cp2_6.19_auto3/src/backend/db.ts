import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'recipes.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(recipe_id)
  );

  CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id);
`);

export interface Recipe {
  id: number;
  title: string;
  ingredients: string[];
  steps: string[];
  coverImage: string;
  likes: number;
  createdAt: string;
  isFavorite?: boolean;
}

interface RecipeRow {
  id: number;
  title: string;
  ingredients: string;
  steps: string;
  cover_image: string;
  likes: number;
  created_at: string;
  is_favorite: number | null;
}

const rowToRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  title: row.title,
  ingredients: JSON.parse(row.ingredients),
  steps: JSON.parse(row.steps),
  coverImage: row.cover_image,
  likes: row.likes,
  createdAt: row.created_at,
  isFavorite: row.is_favorite === 1
});

export const getRecipes = (page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const rows = db
    .prepare(`
      SELECT r.*, CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
      FROM recipes r
      LEFT JOIN favorites f ON r.id = f.recipe_id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset) as RecipeRow[];

  const total = db.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number };

  return {
    data: rows.map(rowToRecipe),
    total: total.count
  };
};

export const getRecipeById = (id: number) => {
  const row = db
    .prepare(`
      SELECT r.*, CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
      FROM recipes r
      LEFT JOIN favorites f ON r.id = f.recipe_id
      WHERE r.id = ?
    `)
    .get(id) as RecipeRow | undefined;

  return row ? rowToRecipe(row) : null;
};

export const createRecipe = (data: {
  title: string;
  ingredients: string[];
  steps: string[];
  coverImage: string;
}) => {
  const stmt = db.prepare(`
    INSERT INTO recipes (title, ingredients, steps, cover_image)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.title,
    JSON.stringify(data.ingredients),
    JSON.stringify(data.steps),
    data.coverImage
  );
  return getRecipeById(result.lastInsertRowid as number);
};

export const updateRecipe = (
  id: number,
  data: Partial<{
    title: string;
    ingredients: string[];
    steps: string[];
    coverImage: string;
  }>
) => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.ingredients !== undefined) {
    fields.push('ingredients = ?');
    values.push(JSON.stringify(data.ingredients));
  }
  if (data.steps !== undefined) {
    fields.push('steps = ?');
    values.push(JSON.stringify(data.steps));
  }
  if (data.coverImage !== undefined) {
    fields.push('cover_image = ?');
    values.push(data.coverImage);
  }

  if (fields.length === 0) return getRecipeById(id);

  values.push(id);
  db.prepare(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRecipeById(id);
};

export const deleteRecipe = (id: number) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  return true;
};

export const likeRecipe = (id: number) => {
  db.prepare('UPDATE recipes SET likes = likes + 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT likes FROM recipes WHERE id = ?').get(id) as { likes: number } | undefined;
  return row ? { likes: row.likes } : null;
};

export const toggleFavorite = (id: number, favorite: boolean) => {
  if (favorite) {
    db.prepare('INSERT OR IGNORE INTO favorites (recipe_id) VALUES (?)').run(id);
  } else {
    db.prepare('DELETE FROM favorites WHERE recipe_id = ?').run(id);
  }
  return { isFavorite: favorite };
};

export const getFavorites = () => {
  const rows = db
    .prepare(`
      SELECT r.*, 1 AS is_favorite
      FROM recipes r
      INNER JOIN favorites f ON r.id = f.recipe_id
      ORDER BY f.created_at DESC
    `)
    .all() as RecipeRow[];
  return rows.map(rowToRecipe);
};

const seedRecipes = [
  {
    title: '番茄牛腩煲',
    ingredients: ['牛腩 500g', '番茄 3个', '土豆 1个', '胡萝卜 1根', '洋葱 半个', '姜片 3片', '料酒 1勺', '生抽 2勺', '盐 适量'],
    steps: [
      '牛腩切块冷水下锅，加料酒焯水后捞出冲洗干净。',
      '番茄去皮切块，土豆胡萝卜切滚刀块，洋葱切丝。',
      '热锅下油，爆香姜片和洋葱，加入番茄炒出沙汁。',
      '加入牛腩翻炒均匀，倒入生抽和热水没过食材。',
      '大火烧开转小火炖煮60分钟。',
      '加入土豆和胡萝卜继续炖20分钟，最后加盐调味即可。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=a%20warm%20hearty%20chinese%20tomato%20beef%20stew%20in%20clay%20pot%20with%20steam%20food%20photography&image_size=square_hd',
    likes: 128
  },
  {
    title: '麻婆豆腐',
    ingredients: ['嫩豆腐 1块', '猪肉末 100g', '郫县豆瓣酱 1勺', '花椒粉 半勺', '蒜末 1勺', '葱花 适量', '生抽 1勺', '淀粉水 适量'],
    steps: [
      '豆腐切小块，用淡盐水浸泡10分钟后沥干。',
      '热锅下油，放入肉末炒散炒香。',
      '加入蒜末和豆瓣酱炒出红油。',
      '倒入适量清水烧开，放入豆腐块轻轻推动。',
      '加生抽调味，小火煮5分钟让豆腐入味。',
      '淋入淀粉水勾芡，撒上花椒粉和葱花即可出锅。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=authentic%20sichuan%20mapo%20tofu%20with%20minced%20pork%20red%20chili%20oil%20and%20green%20onions%20food%20photography&image_size=square_hd',
    likes: 256
  },
  {
    title: '蒜蓉粉丝蒸虾',
    ingredients: ['鲜虾 12只', '粉丝 1把', '大蒜 1整头', '生抽 2勺', '蚝油 1勺', '料酒 1勺', '葱花 适量', '小米辣 2个'],
    steps: [
      '鲜虾去虾线开背，粉丝用温水泡软。',
      '大蒜剁成蒜蓉，热油浇淋激发香味，加生抽蚝油拌匀。',
      '粉丝铺在盘底，鲜虾摆在粉丝上。',
      '将蒜蓉酱均匀浇在虾背上。',
      '水开后上锅大火蒸6-8分钟。',
      '出锅撒上葱花和小米辣，淋上热油激香即可。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=steamed%20shrimp%20with%20garlic%20and%20vermicelli%20noodles%20chinese%20seafood%20dish%20food%20photography&image_size=square_hd',
    likes: 312
  },
  {
    title: '红烧肉',
    ingredients: ['五花肉 500g', '冰糖 30g', '生抽 3勺', '老抽 1勺', '料酒 2勺', '姜片 5片', '八角 2个', '桂皮 1小块'],
    steps: [
      '五花肉切3cm方块，冷水下锅焯水备用。',
      '冷锅冷油下冰糖，小火慢慢炒出糖色呈枣红色。',
      '放入五花肉快速翻炒上色。',
      '加入姜片、八角、桂皮炒香，倒入料酒、生抽、老抽。',
      '加入热水没过肉块，大火烧开转小火炖60分钟。',
      '最后大火收汁，让每块肉都裹上亮泽的酱汁。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20braised%20pork%20belly%20hong%20shao%20rou%20glossy%20caramelized%20sauce%20food%20photography&image_size=square_hd',
    likes: 512
  },
  {
    title: '糖醋里脊',
    ingredients: ['猪里脊肉 300g', '番茄酱 3勺', '白醋 2勺', '白糖 2勺', '生抽 1勺', '淀粉 适量', '鸡蛋 1个', '料酒 1勺'],
    steps: [
      '里脊肉切条，加料酒、生抽、盐腌制15分钟。',
      '淀粉加鸡蛋和少量水调成面糊，裹在里脊条上。',
      '油温六成热下锅炸至定型捞出，油温升高再复炸至金黄酥脆。',
      '调制糖醋汁：番茄酱、白醋、白糖、少量清水调匀。',
      '锅中留底油，倒入糖醋汁熬至浓稠。',
      '放入炸好的里脊快速翻炒均匀即可出锅。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sweet%20and%20sour%20pork%20tenderloin%20tang%20cu%20li%20ji%20crispy%20with%20red%20sauce%20chinese%20food%20photography&image_size=square_hd',
    likes: 288
  },
  {
    title: '宫保鸡丁',
    ingredients: ['鸡胸肉 300g', '花生米 50g', '干辣椒 10个', '花椒 1勺', '黄瓜 1根', '大葱 1段', '生抽 2勺', '醋 1勺', '白糖 1勺', '淀粉 适量'],
    steps: [
      '鸡胸肉切丁，加生抽、料酒、淀粉腌制15分钟。',
      '调制碗汁：生抽、醋、白糖、淀粉、少量清水调匀。',
      '黄瓜切丁，大葱切段，干辣椒剪段去籽。',
      '热锅下油，爆香花椒和干辣椒，放入鸡丁滑炒变色。',
      '加入葱段和黄瓜丁翻炒几下。',
      '倒入碗汁快速翻炒，最后撒入花生米翻匀即可。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kung%20pao%20chicken%20gong%20bao%20ji%20ding%20with%20peanuts%20dried%20chili%20cucumber%20chinese%20food%20photography&image_size=square_hd',
    likes: 196
  },
  {
    title: '日式照烧鸡腿饭',
    ingredients: ['去骨鸡腿 2个', '米饭 2碗', '生抽 3勺', '味淋 2勺', '清酒 1勺', '蜂蜜 1勺', '西兰花 适量', '白芝麻 适量'],
    steps: [
      '鸡腿肉用叉子扎孔便于入味，用厨房纸吸干水分。',
      '调制照烧汁：生抽、味淋、清酒、蜂蜜混合均匀。',
      '鸡皮朝下放入平底锅，中小火煎至金黄出油后翻面。',
      '两面金黄后倒入照烧汁，小火慢慢收汁。',
      '中途不断将酱汁浇在鸡肉上，直至浓稠裹满鸡肉。',
      '鸡肉切片摆在米饭上，淋上剩余酱汁，配焯水西兰花，撒白芝麻。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20teriyaki%20chicken%20rice%20bowl%20with%20broccoli%20sesame%20seeds%20food%20photography&image_size=square_hd',
    likes: 175
  },
  {
    title: '芒果糯米饭',
    ingredients: ['糯米 200g', '椰浆 250ml', '芒果 2个', '白糖 40g', '盐 少许', '熟芝麻 适量', '斑斓叶 2片（可选）'],
    steps: [
      '糯米提前浸泡4小时，斑斓叶打结。',
      '糯米沥干加水蒸熟，约30分钟至软糯。',
      '椰浆加白糖和少许盐加热搅拌至糖融化。',
      '取一半椰浆倒入糯米饭中拌匀，静置10分钟让米粒充分吸收。',
      '芒果去皮核切薄片。',
      '糯米饭盛盘，芒果片摆旁边，淋上剩余椰浆，撒熟芝麻即可。'
    ],
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=thai%20mango%20sticky%20rice%20dessert%20with%20coconut%20milk%20sesame%20seeds%20tropical%20food%20photography&image_size=square_hd',
    likes: 224
  }
];

const count = db.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO recipes (title, ingredients, steps, cover_image, likes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((recipes: typeof seedRecipes) => {
    for (const r of recipes) {
      insert.run(r.title, JSON.stringify(r.ingredients), JSON.stringify(r.steps), r.coverImage, r.likes);
    }
  });
  tx(seedRecipes);
  console.log('已插入种子数据');
}

export default db;
