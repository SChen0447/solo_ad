import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, FridgeIngredient, Rating, RecommendedRecipe, Ingredient, RecipeStep } from './types';

function computeCoverage(recipe: Recipe, fridgeItems: FridgeIngredient[]): number {
  const available = new Set(fridgeItems.filter(f => !f.usedUp).map(f => f.name));
  if (recipe.ingredients.length === 0) return 0;
  const matched = recipe.ingredients.filter(ing => available.has(ing.name)).length;
  return matched / recipe.ingredients.length;
}

function getRecommendations(recipes: Recipe[], fridgeItems: FridgeIngredient[]): RecommendedRecipe[] {
  return recipes
    .map(recipe => ({ recipe, coverage: computeCoverage(recipe, fridgeItems) }))
    .filter(r => r.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 5);
}

function getAverageRating(ratings: Rating[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: uuidv4(), name: '宫保鸡丁', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Kung%20Pao%20Chicken%20dish%20on%20white%20plate%2C%20Chinese%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 25, difficulty: 'medium', cuisine: '中餐',
    ingredients: [
      { id: uuidv4(), name: '鸡胸肉', quantity: 300, unit: '克' },
      { id: uuidv4(), name: '花生米', quantity: 50, unit: '克' },
      { id: uuidv4(), name: '干辣椒', quantity: 8, unit: '个' },
      { id: uuidv4(), name: '花椒', quantity: 5, unit: '克' },
      { id: uuidv4(), name: '葱', quantity: 2, unit: '根' },
      { id: uuidv4(), name: '姜', quantity: 3, unit: '片' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '鸡胸肉切丁，加入料酒、盐、淀粉腌制15分钟' },
      { id: uuidv4(), order: 2, description: '花生米油炸至金黄备用' },
      { id: uuidv4(), order: 3, description: '锅中热油，爆香干辣椒和花椒' },
      { id: uuidv4(), order: 4, description: '放入鸡丁翻炒至变色' },
      { id: uuidv4(), order: 5, description: '加入调味汁翻炒均匀，撒入花生米即可' },
    ],
    ratings: [{ userId: 'u1', stars: 4, comment: '非常经典', createdAt: Date.now() - 86400000 }],
    createdAt: Date.now() - 172800000,
  },
  {
    id: uuidv4(), name: '番茄炒蛋', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tomato%20scrambled%20eggs%20on%20plate%2C%20Chinese%20home%20cooking%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 10, difficulty: 'easy', cuisine: '中餐',
    ingredients: [
      { id: uuidv4(), name: '番茄', quantity: 2, unit: '个' },
      { id: uuidv4(), name: '鸡蛋', quantity: 3, unit: '个' },
      { id: uuidv4(), name: '盐', quantity: 3, unit: '克' },
      { id: uuidv4(), name: '糖', quantity: 5, unit: '克' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '番茄切块，鸡蛋打散' },
      { id: uuidv4(), order: 2, description: '热锅下油，倒入蛋液翻炒至凝固盛出' },
      { id: uuidv4(), order: 3, description: '另起锅炒番茄至出汁' },
      { id: uuidv4(), order: 4, description: '倒入炒好的鸡蛋，加盐和糖调味即可' },
    ],
    ratings: [{ userId: 'u2', stars: 5, comment: '家常必备', createdAt: Date.now() - 43200000 }],
    createdAt: Date.now() - 259200000,
  },
  {
    id: uuidv4(), name: '意大利肉酱面', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Spaghetti%20Bolognese%20on%20plate%2C%20Italian%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 45, difficulty: 'medium', cuisine: '西餐',
    ingredients: [
      { id: uuidv4(), name: '意大利面', quantity: 200, unit: '克' },
      { id: uuidv4(), name: '牛肉末', quantity: 250, unit: '克' },
      { id: uuidv4(), name: '番茄酱', quantity: 200, unit: '毫升' },
      { id: uuidv4(), name: '洋葱', quantity: 1, unit: '个' },
      { id: uuidv4(), name: '大蒜', quantity: 3, unit: '瓣' },
      { id: uuidv4(), name: '橄榄油', quantity: 30, unit: '毫升' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '大锅煮水，加盐煮意面至al dente' },
      { id: uuidv4(), order: 2, description: '热锅加橄榄油，炒洋葱和大蒜至透明' },
      { id: uuidv4(), order: 3, description: '加入牛肉末翻炒至变色' },
      { id: uuidv4(), order: 4, description: '倒入番茄酱，小火慢炖20分钟' },
      { id: uuidv4(), order: 5, description: '将肉酱浇在意面上即可' },
    ],
    ratings: [],
    createdAt: Date.now() - 345600000,
  },
  {
    id: uuidv4(), name: '味噌汤', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Miso%20soup%20in%20bowl%2C%20Japanese%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 15, difficulty: 'easy', cuisine: '日料',
    ingredients: [
      { id: uuidv4(), name: '味噌酱', quantity: 30, unit: '克' },
      { id: uuidv4(), name: '豆腐', quantity: 150, unit: '克' },
      { id: uuidv4(), name: '海带', quantity: 5, unit: '克' },
      { id: uuidv4(), name: '柴鱼片', quantity: 10, unit: '克' },
      { id: uuidv4(), name: '葱', quantity: 1, unit: '根' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '海带泡发后煮出高汤' },
      { id: uuidv4(), order: 2, description: '取出海带，加入柴鱼片略煮后过滤' },
      { id: uuidv4(), order: 3, description: '豆腐切小块放入汤中' },
      { id: uuidv4(), order: 4, description: '关火后将味噌酱溶入汤中，撒葱花即可' },
    ],
    ratings: [{ userId: 'u3', stars: 4, comment: '简单好喝', createdAt: Date.now() - 7200000 }],
    createdAt: Date.now() - 432000000,
  },
  {
    id: uuidv4(), name: '韩式泡菜炒饭', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Kimchi%20fried%20rice%20in%20bowl%2C%20Korean%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 15, difficulty: 'easy', cuisine: '韩餐',
    ingredients: [
      { id: uuidv4(), name: '米饭', quantity: 300, unit: '克' },
      { id: uuidv4(), name: '泡菜', quantity: 100, unit: '克' },
      { id: uuidv4(), name: '鸡蛋', quantity: 1, unit: '个' },
      { id: uuidv4(), name: '葱', quantity: 1, unit: '根' },
      { id: uuidv4(), name: '香油', quantity: 10, unit: '毫升' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '泡菜切碎，葱切葱花' },
      { id: uuidv4(), order: 2, description: '热锅加香油，炒泡菜至香味飘出' },
      { id: uuidv4(), order: 3, description: '加入米饭大火翻炒均匀' },
      { id: uuidv4(), order: 4, description: '煎一个太阳蛋放在炒饭上即可' },
    ],
    ratings: [],
    createdAt: Date.now() - 518400000,
  },
  {
    id: uuidv4(), name: '泰式冬阴功汤', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tom%20Yum%20soup%20in%20bowl%2C%20Thai%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 30, difficulty: 'hard', cuisine: '东南亚',
    ingredients: [
      { id: uuidv4(), name: '虾', quantity: 200, unit: '克' },
      { id: uuidv4(), name: '柠檬草', quantity: 2, unit: '根' },
      { id: uuidv4(), name: '南姜', quantity: 20, unit: '克' },
      { id: uuidv4(), name: '青柠叶', quantity: 5, unit: '片' },
      { id: uuidv4(), name: '椰奶', quantity: 200, unit: '毫升' },
      { id: uuidv4(), name: '辣椒', quantity: 3, unit: '个' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '锅中加水煮开，放入柠檬草、南姜和青柠叶' },
      { id: uuidv4(), order: 2, description: '煮5分钟后加入虾煮至变色' },
      { id: uuidv4(), order: 3, description: '加入鱼露、青柠汁和辣椒调味' },
      { id: uuidv4(), order: 4, description: '最后倒入椰奶搅匀即可出锅' },
    ],
    ratings: [{ userId: 'u4', stars: 5, comment: '酸辣鲜美', createdAt: Date.now() - 3600000 }],
    createdAt: Date.now() - 604800000,
  },
  {
    id: uuidv4(), name: '法式焗蜗牛', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Escargots%20de%20Bourgogne%20on%20plate%2C%20French%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 25, difficulty: 'hard', cuisine: '西餐',
    ingredients: [
      { id: uuidv4(), name: '蜗牛', quantity: 12, unit: '只' },
      { id: uuidv4(), name: '黄油', quantity: 60, unit: '克' },
      { id: uuidv4(), name: '大蒜', quantity: 4, unit: '瓣' },
      { id: uuidv4(), name: '欧芹', quantity: 10, unit: '克' },
      { id: uuidv4(), name: '白葡萄酒', quantity: 30, unit: '毫升' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '黄油软化，加入蒜末和欧芹碎拌匀' },
      { id: uuidv4(), order: 2, description: '蜗牛洗净，放入专用烤盘' },
      { id: uuidv4(), order: 3, description: '每个蜗牛上放入蒜香黄油' },
      { id: uuidv4(), order: 4, description: '烤箱200度烤10-12分钟即可' },
    ],
    ratings: [],
    createdAt: Date.now() - 691200000,
  },
  {
    id: uuidv4(), name: '日式咖喱饭', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Japanese%20curry%20rice%20on%20plate%2C%20Japanese%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 40, difficulty: 'easy', cuisine: '日料',
    ingredients: [
      { id: uuidv4(), name: '咖喱块', quantity: 100, unit: '克' },
      { id: uuidv4(), name: '土豆', quantity: 2, unit: '个' },
      { id: uuidv4(), name: '胡萝卜', quantity: 1, unit: '根' },
      { id: uuidv4(), name: '洋葱', quantity: 1, unit: '个' },
      { id: uuidv4(), name: '鸡肉', quantity: 200, unit: '克' },
      { id: uuidv4(), name: '米饭', quantity: 300, unit: '克' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '蔬菜切丁，鸡肉切块' },
      { id: uuidv4(), order: 2, description: '热锅炒鸡肉至变色' },
      { id: uuidv4(), order: 3, description: '加入蔬菜翻炒' },
      { id: uuidv4(), order: 4, description: '加水没过食材，煮至蔬菜软烂' },
      { id: uuidv4(), order: 5, description: '关火加入咖喱块搅拌融化，再小火煮5分钟' },
      { id: uuidv4(), order: 6, description: '浇在米饭上即可' },
    ],
    ratings: [{ userId: 'u5', stars: 4, comment: '方便好吃', createdAt: Date.now() - 14400000 }],
    createdAt: Date.now() - 777600000,
  },
  {
    id: uuidv4(), name: '红烧肉', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Braised%20pork%20belly%20on%20plate%2C%20Chinese%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 60, difficulty: 'medium', cuisine: '中餐',
    ingredients: [
      { id: uuidv4(), name: '五花肉', quantity: 500, unit: '克' },
      { id: uuidv4(), name: '酱油', quantity: 30, unit: '毫升' },
      { id: uuidv4(), name: '冰糖', quantity: 30, unit: '克' },
      { id: uuidv4(), name: '料酒', quantity: 30, unit: '毫升' },
      { id: uuidv4(), name: '姜', quantity: 3, unit: '片' },
      { id: uuidv4(), name: '八角', quantity: 2, unit: '个' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '五花肉切块，冷水下锅焯水去腥' },
      { id: uuidv4(), order: 2, description: '锅中放少许油，小火炒冰糖至焦糖色' },
      { id: uuidv4(), order: 3, description: '放入五花肉翻炒上色' },
      { id: uuidv4(), order: 4, description: '加入酱油、料酒、姜、八角，加水没过肉' },
      { id: uuidv4(), order: 5, description: '大火烧开后转小火炖45分钟' },
      { id: uuidv4(), order: 6, description: '大火收汁即可' },
    ],
    ratings: [{ userId: 'u6', stars: 5, comment: '入口即化', createdAt: Date.now() - 28800000 }],
    createdAt: Date.now() - 864000000,
  },
  {
    id: uuidv4(), name: '凯撒沙拉', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Caesar%20salad%20on%20plate%2C%20Western%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 15, difficulty: 'easy', cuisine: '西餐',
    ingredients: [
      { id: uuidv4(), name: '罗马生菜', quantity: 200, unit: '克' },
      { id: uuidv4(), name: '面包丁', quantity: 50, unit: '克' },
      { id: uuidv4(), name: '帕玛森芝士', quantity: 30, unit: '克' },
      { id: uuidv4(), name: '凯撒酱', quantity: 50, unit: '毫升' },
      { id: uuidv4(), name: '柠檬汁', quantity: 10, unit: '毫升' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '生菜洗净撕成大块' },
      { id: uuidv4(), order: 2, description: '面包丁烤至金黄酥脆' },
      { id: uuidv4(), order: 3, description: '将生菜、面包丁放入大碗' },
      { id: uuidv4(), order: 4, description: '淋上凯撒酱和柠檬汁，刨上帕玛森芝士即可' },
    ],
    ratings: [],
    createdAt: Date.now() - 950400000,
  },
  {
    id: uuidv4(), name: '麻婆豆腐', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mapo%20Tofu%20on%20plate%2C%20Chinese%20Sichuan%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 20, difficulty: 'medium', cuisine: '中餐',
    ingredients: [
      { id: uuidv4(), name: '豆腐', quantity: 400, unit: '克' },
      { id: uuidv4(), name: '猪肉末', quantity: 100, unit: '克' },
      { id: uuidv4(), name: '豆瓣酱', quantity: 20, unit: '克' },
      { id: uuidv4(), name: '花椒粉', quantity: 3, unit: '克' },
      { id: uuidv4(), name: '葱', quantity: 1, unit: '根' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '豆腐切小块，焯水备用' },
      { id: uuidv4(), order: 2, description: '热锅炒肉末至变色' },
      { id: uuidv4(), order: 3, description: '加入豆瓣酱炒出红油' },
      { id: uuidv4(), order: 4, description: '加入豆腐轻轻翻炒，加水略煮' },
      { id: uuidv4(), order: 5, description: '勾芡收汁，撒花椒粉和葱花即可' },
    ],
    ratings: [{ userId: 'u7', stars: 4, comment: '麻辣鲜香', createdAt: Date.now() - 7200000 }],
    createdAt: Date.now() - 1036800000,
  },
  {
    id: uuidv4(), name: '寿司拼盘', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sushi%20platter%2C%20Japanese%20cuisine%2C%20food%20photography&image_size=landscape_4_3',
    cookTime: 50, difficulty: 'hard', cuisine: '日料',
    ingredients: [
      { id: uuidv4(), name: '寿司米', quantity: 300, unit: '克' },
      { id: uuidv4(), name: '三文鱼', quantity: 150, unit: '克' },
      { id: uuidv4(), name: '金枪鱼', quantity: 100, unit: '克' },
      { id: uuidv4(), name: '海苔', quantity: 5, unit: '张' },
      { id: uuidv4(), name: '米醋', quantity: 40, unit: '毫升' },
      { id: uuidv4(), name: '酱油', quantity: 20, unit: '毫升' },
      { id: uuidv4(), name: '芥末', quantity: 5, unit: '克' },
    ],
    steps: [
      { id: uuidv4(), order: 1, description: '寿司米洗净煮好，拌入米醋晾凉' },
      { id: uuidv4(), order: 2, description: '鱼类切成薄片' },
      { id: uuidv4(), order: 3, description: '手沾水，取适量米饭捏成椭圆形' },
      { id: uuidv4(), order: 4, description: '鱼片覆盖在米饭上，轻轻按压' },
      { id: uuidv4(), order: 5, description: '卷寿司：海苔上铺米饭和配料，用竹帘卷紧' },
      { id: uuidv4(), order: 6, description: '切片摆盘，配酱油和芥末' },
    ],
    ratings: [{ userId: 'u8', stars: 5, comment: '精致美味', createdAt: Date.now() - 18000000 }],
    createdAt: Date.now() - 1123200000,
  },
];

const INITIAL_FRIDGE: FridgeIngredient[] = [
  { id: uuidv4(), name: '鸡蛋', quantity: 6, unit: '个', usedUp: false },
  { id: uuidv4(), name: '番茄', quantity: 3, unit: '个', usedUp: false },
  { id: uuidv4(), name: '葱', quantity: 4, unit: '根', usedUp: false },
  { id: uuidv4(), name: '姜', quantity: 2, unit: '块', usedUp: false },
  { id: uuidv4(), name: '盐', quantity: 200, unit: '克', usedUp: false },
  { id: uuidv4(), name: '米饭', quantity: 500, unit: '克', usedUp: false },
  { id: uuidv4(), name: '豆腐', quantity: 300, unit: '克', usedUp: false },
  { id: uuidv4(), name: '洋葱', quantity: 2, unit: '个', usedUp: false },
];

interface RecipeStore {
  recipes: Recipe[];
  fridgeItems: FridgeIngredient[];
  favorites: Set<string>;
  toastMessage: string | null;
  toastVisible: boolean;
  selectedRecipeId: string | null;
  showForm: boolean;
  editingRecipeId: string | null;

  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'ratings'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  addRating: (recipeId: string, rating: Omit<Rating, 'createdAt'>) => void;
  toggleFavorite: (id: string) => void;

  addFridgeItem: (item: Omit<FridgeIngredient, 'id'>) => void;
  removeFridgeItem: (id: string) => void;
  updateFridgeItem: (id: string, updates: Partial<FridgeIngredient>) => void;
  toggleUsedUp: (id: string) => void;

  getRecommendations: () => RecommendedRecipe[];
  getAverageRating: (recipeId: string) => number;

  showToast: (message: string) => void;
  hideToast: () => void;
  setSelectedRecipe: (id: string | null) => void;
  openForm: (editId?: string) => void;
  closeForm: () => void;

  toggleIngredientPurchased: (recipeId: string, ingredientId: string) => void;
  toggleStepCompleted: (recipeId: string, stepId: string) => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: SAMPLE_RECIPES,
  fridgeItems: INITIAL_FRIDGE,
  favorites: new Set<string>(),
  toastMessage: null,
  toastVisible: false,
  selectedRecipeId: null,
  showForm: false,
  editingRecipeId: null,

  addRecipe: (recipeData) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: uuidv4(),
      ratings: [],
      createdAt: Date.now(),
    };
    set((state) => ({ recipes: [newRecipe, ...state.recipes] }));
    get().showToast('食谱添加成功！');
  },

  updateRecipe: (id, updates) => {
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
    get().showToast('食谱更新成功！');
  },

  deleteRecipe: (id) => {
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }));
    get().showToast('食谱已删除');
  },

  addRating: (recipeId, rating) => {
    const newRating: Rating = { ...rating, createdAt: Date.now() };
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === recipeId ? { ...r, ratings: [...r.ratings, newRating] } : r
      ),
    }));
  },

  toggleFavorite: (id) => {
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { favorites: next };
    });
  },

  addFridgeItem: (item) => {
    const newItem: FridgeIngredient = { ...item, id: uuidv4() };
    set((state) => ({ fridgeItems: [...state.fridgeItems, newItem] }));
  },

  removeFridgeItem: (id) => {
    set((state) => ({ fridgeItems: state.fridgeItems.filter((f) => f.id !== id) }));
  },

  updateFridgeItem: (id, updates) => {
    set((state) => ({
      fridgeItems: state.fridgeItems.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  toggleUsedUp: (id) => {
    set((state) => ({
      fridgeItems: state.fridgeItems.map((f) =>
        f.id === id ? { ...f, usedUp: !f.usedUp } : f
      ),
    }));
  },

  getRecommendations: () => {
    const { recipes, fridgeItems } = get();
    return getRecommendations(recipes, fridgeItems);
  },

  getAverageRating: (recipeId) => {
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) return 0;
    return getAverageRating(recipe.ratings);
  },

  showToast: (message) => {
    set({ toastMessage: message, toastVisible: true });
    setTimeout(() => {
      get().hideToast();
    }, 2000);
  },

  hideToast: () => {
    set({ toastVisible: false });
  },

  setSelectedRecipe: (id) => {
    set({ selectedRecipeId: id });
  },

  openForm: (editId) => {
    set({ showForm: true, editingRecipeId: editId || null });
  },

  closeForm: () => {
    set({ showForm: false, editingRecipeId: null });
  },

  toggleIngredientPurchased: (recipeId, ingredientId) => {
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              ingredients: r.ingredients.map((ing: Ingredient) =>
                ing.id === ingredientId ? { ...ing, purchased: !ing.purchased } : ing
              ),
            }
          : r
      ),
    }));
  },

  toggleStepCompleted: (recipeId, stepId) => {
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              steps: r.steps.map((s: RecipeStep) =>
                s.id === stepId ? { ...s, completed: !s.completed } : s
              ),
            }
          : r
      ),
    }));
  },
}));
