import { create } from 'zustand';
import type { Recipe } from '@/types';

const STORAGE_KEY = 'recipe-binder-recipes';

const loadFromStorage = (): Recipe[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    console.warn('Failed to load recipes from localStorage');
  }
  return getDefaultRecipes();
};

const saveToStorage = (recipes: Recipe[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    console.warn('Failed to save recipes to localStorage');
  }
};

const getDefaultRecipes = (): Recipe[] => {
  const foodCategories = ['food', 'dish', 'cooking', 'pasta', 'salad', 'soup', 'dessert', 'breakfast', 'lunch', 'dinner'];
  const titles = [
    '番茄意大利面', '宫保鸡丁', '红烧排骨', '清炒时蔬', '日式咖喱饭',
    '麻婆豆腐', '糖醋里脊', '蒜蓉西兰花', '蛋炒饭', '牛肉面',
    '照烧鸡腿', '蔬菜沙拉', '奶油蘑菇汤', '提拉米苏', '三明治',
    '红烧肉', '水煮鱼', '鱼香肉丝', '凉拌黄瓜', '皮蛋瘦肉粥',
  ];
  const ingredientsList = [
    [
      { name: '意面', amount: '200g' },
      { name: '番茄', amount: '2个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '橄榄油', amount: '2勺' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '少许' },
    ],
    [
      { name: '鸡胸肉', amount: '300g' },
      { name: '花生米', amount: '50g' },
      { name: '干辣椒', amount: '10个' },
      { name: '花椒', amount: '1勺' },
      { name: '葱姜蒜', amount: '适量' },
      { name: '生抽', amount: '2勺' },
      { name: '醋', amount: '1勺' },
      { name: '糖', amount: '1勺' },
    ],
    [
      { name: '排骨', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '3勺' },
      { name: '老抽', amount: '1勺' },
      { name: '料酒', amount: '2勺' },
      { name: '姜片', amount: '5片' },
    ],
  ];
  const stepsList = [
    [
      { order: 1, description: '锅中加水煮沸，加入盐和意面，煮至八成熟捞出备用。' },
      { order: 2, description: '番茄顶部划十字，用开水烫一下去皮，切成小丁备用。' },
      { order: 3, description: '热锅倒油，放入蒜末爆香，加入番茄丁翻炒出汁。' },
      { order: 4, description: '加入煮好的意面，翻炒均匀，加盐和黑胡椒调味。' },
      { order: 5, description: '装盘后可撒上帕玛森芝士和新鲜罗勒叶。' },
    ],
    [
      { order: 1, description: '鸡胸肉切丁，用料酒、生抽、淀粉腌制15分钟。' },
      { order: 2, description: '调碗汁：生抽、醋、糖、淀粉、清水混合均匀。' },
      { order: 3, description: '热锅冷油，放入花生米小火炸至金黄捞出。' },
      { order: 4, description: '锅中留底油，爆香干辣椒和花椒，放入鸡丁翻炒。' },
      { order: 5, description: '加入葱姜蒜炒香，倒入碗汁翻炒至浓稠。' },
      { order: 6, description: '最后加入花生米快速翻炒均匀即可出锅。' },
    ],
    [
      { order: 1, description: '排骨冷水下锅，加料酒姜片焯水，捞出洗净备用。' },
      { order: 2, description: '锅中放少许油，加入冰糖小火炒出糖色。' },
      { order: 3, description: '放入排骨翻炒上色，加入生抽、老抽、料酒。' },
      { order: 4, description: '加没过排骨的热水，大火烧开后转小火炖40分钟。' },
      { order: 5, description: '大火收汁，汤汁浓稠即可出锅。' },
    ],
  ];

  return titles.map((title, i) => ({
    id: `default-${i}`,
    title,
    image: `https://picsum.photos/seed/${foodCategories[i % foodCategories.length]}-${i}/240/160`,
    cookingTime: 20 + (i % 5) * 10,
    ingredients: ingredientsList[i % 3],
    steps: stepsList[i % 3],
    isFavorite: i < 3,
  }));
};

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  toggleFavorite: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: loadFromStorage(),

  addRecipe: (recipe: Recipe) => {
    set(state => {
      const next = [recipe, ...state.recipes];
      saveToStorage(next);
      return { recipes: next };
    });
  },

  toggleFavorite: (id: string) => {
    set(state => {
      const next = state.recipes.map(r =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      );
      saveToStorage(next);
      return { recipes: next };
    });
  },

  getRecipe: (id: string) => {
    return get().recipes.find(r => r.id === id);
  },
}));
