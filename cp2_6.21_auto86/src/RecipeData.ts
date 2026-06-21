export interface Recipe {
  id: string;
  name: string;
  cuisine: '中餐' | '西餐' | '日料' | '其他';
  ingredients: string[];
}

export interface IngredientCalorie {
  name: string;
  calories: number;
  amount: string;
}

const CALORIE_MAP: Record<string, number> = {
  '鸡肉': 167, '牛肉': 250, '猪肉': 242, '鱼': 105, '虾': 99,
  '鸡蛋': 155, '豆腐': 76, '米饭': 130, '面条': 138, '面包': 265,
  '土豆': 77, '番茄': 18, '洋葱': 40, '胡萝卜': 41, '白菜': 13,
  '菠菜': 23, '蘑菇': 22, '青椒': 20, '大蒜': 149, '生姜': 80,
  '牛奶': 42, '黄油': 717, '奶酪': 402, '奶油': 340, '橄榄油': 884,
  '酱油': 53, '醋': 18, '盐': 0, '糖': 387, '胡椒粉': 251,
  '三文鱼': 208, '金枪鱼': 144, '海带': 43, '紫菜': 35, '味噌': 199,
  '火腿': 145, '培根': 541, '香肠': 301, '玉米': 86, '豌豆': 81,
  '芹菜': 14, '黄瓜': 15, '茄子': 25, '南瓜': 26, '西兰花': 34,
  '面粉': 364, '意大利面': 157, '芝士': 402, '罗勒': 23,
};

const AMOUNT_MAP: Record<string, string> = {
  '鸡肉': '200g', '牛肉': '200g', '猪肉': '200g', '鱼': '250g', '虾': '150g',
  '鸡蛋': '2个', '豆腐': '200g', '米饭': '200g', '面条': '200g', '面包': '2片',
  '土豆': '150g', '番茄': '1个', '洋葱': '1个', '胡萝卜': '1根', '白菜': '200g',
  '菠菜': '150g', '蘑菇': '100g', '青椒': '1个', '大蒜': '3瓣', '生姜': '10g',
  '牛奶': '200ml', '黄油': '20g', '奶酪': '50g', '奶油': '50ml', '橄榄油': '15ml',
  '酱油': '15ml', '醋': '10ml', '盐': '3g', '糖': '15g', '胡椒粉': '2g',
  '三文鱼': '200g', '金枪鱼': '150g', '海带': '50g', '紫菜': '3张', '味噌': '30g',
  '火腿': '100g', '培根': '50g', '香肠': '100g', '玉米': '100g', '豌豆': '80g',
  '芹菜': '100g', '黄瓜': '1根', '茄子': '1个', '南瓜': '200g', '西兰花': '150g',
  '面粉': '200g', '意大利面': '200g', '芝士': '50g', '罗勒': '5g',
};

export function getIngredientCalories(ingredient: string): IngredientCalorie {
  return {
    name: ingredient,
    calories: CALORIE_MAP[ingredient] || 100,
    amount: AMOUNT_MAP[ingredient] || '适量',
  };
}

export function estimateCalories(ingredients: string[]): number {
  return ingredients.reduce((sum, ing) => sum + (CALORIE_MAP[ing] || 100), 0);
}

let recipes: Recipe[] = [
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
  { id: '16', name: '蛋炒饭', cuisine: '中餐', ingredients: ['米饭', '鸡蛋', '胡萝卜', '豌豆'] },
  { id: '17', name: '糖醋排骨', cuisine: '中餐', ingredients: ['猪肉', '醋', '糖', '生姜'] },
  { id: '18', name: '土豆炖牛肉', cuisine: '中餐', ingredients: ['牛肉', '土豆', '胡萝卜', '洋葱'] },
  { id: '19', name: '芝士焗饭', cuisine: '西餐', ingredients: ['米饭', '芝士', '黄油', '牛奶'] },
  { id: '20', name: '蒜香面包', cuisine: '西餐', ingredients: ['面包', '大蒜', '黄油', '盐'] },
];

let availableIngredients: string[] = ['鸡肉', '鸡蛋', '番茄', '米饭', '豆腐', '牛肉', '洋葱', '胡萝卜', '土豆', '蘑菇'];

let favoriteRecipeIds: string[] = ['1', '3', '6'];

export async function syncFavoritesFromBackend(): Promise<void> {
  try {
    const res = await fetch('/api/recipes/favorites/ids');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        favoriteRecipeIds = [...data];
      }
    }
  } catch (e) {
    console.warn('同步收藏状态失败:', e);
  }
}

export async function toggleFavoriteAsync(recipeId: string): Promise<boolean> {
  try {
    const isFav = isFavorite(recipeId);
    let res;
    if (isFav) {
      res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
    } else {
      res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
    }
    if (res.ok) {
      const data = await res.json();
      if (data.favoriteIds) {
        favoriteRecipeIds = [...data.favoriteIds];
      }
      return !!data.favorited;
    }
    return toggleFavorite(recipeId);
  } catch (e) {
    console.warn('切换收藏状态失败，使用本地回退:', e);
    return toggleFavorite(recipeId);
  }
}

export async function fetchFavoriteRecipes(): Promise<Recipe[]> {
  try {
    const res = await fetch('/api/recipes/favorites');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        favoriteRecipeIds = data.map(r => r.id);
        return data;
      }
    }
    return getFavoriteRecipes();
  } catch (e) {
    console.warn('获取收藏食谱失败，使用本地回退:', e);
    return getFavoriteRecipes();
  }
}

export function toggleFavorite(recipeId: string): boolean {
  const idx = favoriteRecipeIds.indexOf(recipeId);
  if (idx === -1) {
    favoriteRecipeIds = [...favoriteRecipeIds, recipeId];
    return true;
  } else {
    favoriteRecipeIds = favoriteRecipeIds.filter(id => id !== recipeId);
    return false;
  }
}

export function isFavorite(recipeId: string): boolean {
  return favoriteRecipeIds.includes(recipeId);
}

export function getFavoriteRecipes(): Recipe[] {
  return recipes.filter(r => favoriteRecipeIds.includes(r.id));
}

export function getFavoriteIds(): string[] {
  return [...favoriteRecipeIds];
}

export function getRecipes(): Recipe[] {
  return [...recipes];
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
  const newRecipe: Recipe = { ...recipe, id: Date.now().toString() };
  recipes = [...recipes, newRecipe];
  return newRecipe;
}

export function deleteRecipe(id: string): void {
  recipes = recipes.filter(r => r.id !== id);
}

export function getAvailableIngredients(): string[] {
  return [...availableIngredients];
}

export function addIngredient(name: string): void {
  if (name.trim() && !availableIngredients.includes(name.trim())) {
    availableIngredients = [...availableIngredients, name.trim()];
  }
}

export function removeIngredient(name: string): void {
  availableIngredients = availableIngredients.filter(i => i !== name);
}

export function getMatchingRecipes(): Recipe[] {
  return recipes.filter(recipe => {
    const matchedCount = recipe.ingredients.filter(ing => availableIngredients.includes(ing)).length;
    return matchedCount > 0;
  });
}

export function weightedRandomSelect(recipes: Recipe[], available: string[], count: number): Recipe[] {
  const scored = recipes.map(recipe => {
    const matchedCount = recipe.ingredients.filter(ing => available.includes(ing)).length;
    const matchRatio = matchedCount / recipe.ingredients.length;
    return { recipe, weight: Math.pow(matchRatio, 2) * 10 + 1 };
  });

  const selected: Recipe[] = [];
  const pool = [...scored];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        chosenIndex = j;
        break;
      }
    }

    selected.push(pool[chosenIndex].recipe);
    pool.splice(chosenIndex, 1);
  }

  return selected;
}

export function generateMealPlan(): { day: string; lunch: Recipe | null; dinner: Recipe | null }[] {
  const matching = getMatchingRecipes();
  const available = getAvailableIngredients();

  if (matching.length === 0) {
    return [
      { day: '第一天', lunch: null, dinner: null },
      { day: '第二天', lunch: null, dinner: null },
      { day: '第三天', lunch: null, dinner: null },
    ];
  }

  const neededCount = Math.min(6, matching.length);
  const selected = weightedRandomSelect(matching, available, neededCount);

  const days = ['第一天', '第二天', '第三天'];
  return days.map((day, i) => ({
    day,
    lunch: selected[i * 2] || null,
    dinner: selected[i * 2 + 1] || null,
  }));
}
