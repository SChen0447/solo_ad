import { v4 as uuidv4 } from 'uuid';
import { Recipe, User, Ingredient, ShoppingListItem, RecipeStep } from './models/Recipe';

export const users: Map<string, User> = new Map();
export const recipes: Map<string, Recipe> = new Map();
export const JWT_SECRET = 'smart-recipe-secret-key-2024';

export const ingredientCategories = ['蔬菜', '肉类', '调料', '主食', '海鲜', '蛋奶', '豆制品', '水果', '其他'];

const sampleIngredients: Ingredient[] = [
  { id: uuidv4(), name: '西红柿', quantity: 2, unit: '个', category: '蔬菜' },
  { id: uuidv4(), name: '鸡蛋', quantity: 3, unit: '个', category: '蛋奶' },
  { id: uuidv4(), name: '盐', quantity: 5, unit: '克', category: '调料' },
  { id: uuidv4(), name: '食用油', quantity: 15, unit: '毫升', category: '调料' },
];

const sampleSteps: RecipeStep[] = [
  { id: uuidv4(), order: 1, description: '西红柿洗净切块，鸡蛋打散备用。' },
  { id: uuidv4(), order: 2, description: '热锅倒油，倒入蛋液炒至凝固盛出。' },
  { id: uuidv4(), order: 3, description: '锅中再加少许油，放入西红柿翻炒出汁。' },
  { id: uuidv4(), order: 4, description: '加入炒好的鸡蛋，放盐调味，翻炒均匀即可出锅。' },
];

const sampleRecipe1: Recipe = {
  id: uuidv4(),
  name: '西红柿炒鸡蛋',
  coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
  description: '经典家常菜，酸甜可口，简单易做。',
  ingredients: sampleIngredients,
  steps: sampleSteps,
  tags: ['快手菜', '家常', '酸甜'],
  category: '家常菜',
  isPublic: true,
  authorId: 'system',
  authorName: '系统推荐',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleRecipe2: Recipe = {
  id: uuidv4(),
  name: '青椒土豆丝',
  coverImage: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
  description: '清爽脆嫩的下饭菜。',
  ingredients: [
    { id: uuidv4(), name: '土豆', quantity: 2, unit: '个', category: '蔬菜' },
    { id: uuidv4(), name: '青椒', quantity: 1, unit: '个', category: '蔬菜' },
    { id: uuidv4(), name: '盐', quantity: 3, unit: '克', category: '调料' },
    { id: uuidv4(), name: '醋', quantity: 10, unit: '毫升', category: '调料' },
  ],
  steps: [
    { id: uuidv4(), order: 1, description: '土豆去皮切丝，泡水去淀粉。' },
    { id: uuidv4(), order: 2, description: '青椒切丝备用。' },
    { id: uuidv4(), order: 3, description: '热锅凉油，下土豆丝大火快炒。' },
    { id: uuidv4(), order: 4, description: '加入青椒丝，放盐和醋调味出锅。' },
  ],
  tags: ['快手菜', '辣', '下饭菜'],
  category: '家常菜',
  isPublic: true,
  authorId: 'system',
  authorName: '系统推荐',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleRecipe3: Recipe = {
  id: uuidv4(),
  name: '红烧肉',
  coverImage: 'https://images.unsplash.com/photo-1625944525533-473f1b3d9684?w=400',
  description: '肥而不腻，入口即化的经典红烧肉。',
  ingredients: [
    { id: uuidv4(), name: '五花肉', quantity: 500, unit: '克', category: '肉类' },
    { id: uuidv4(), name: '冰糖', quantity: 30, unit: '克', category: '调料' },
    { id: uuidv4(), name: '生抽', quantity: 20, unit: '毫升', category: '调料' },
    { id: uuidv4(), name: '老抽', quantity: 10, unit: '毫升', category: '调料' },
    { id: uuidv4(), name: '料酒', quantity: 20, unit: '毫升', category: '调料' },
    { id: uuidv4(), name: '八角', quantity: 2, unit: '个', category: '调料' },
  ],
  steps: [
    { id: uuidv4(), order: 1, description: '五花肉切块，冷水下锅焯水去血沫。' },
    { id: uuidv4(), order: 2, description: '锅中放少许油，加入冰糖小火炒出糖色。' },
    { id: uuidv4(), order: 3, description: '放入五花肉翻炒上色。' },
    { id: uuidv4(), order: 4, description: '加入生抽、老抽、料酒、八角，加开水没过肉。' },
    { id: uuidv4(), order: 5, description: '大火烧开后转小火炖1小时，大火收汁即可。' },
  ],
  tags: ['家常', '甜', '硬菜'],
  category: '家常菜',
  isPublic: true,
  authorId: 'system',
  authorName: '系统推荐',
  createdAt: new Date(),
  updatedAt: new Date(),
};

recipes.set(sampleRecipe1.id, sampleRecipe1);
recipes.set(sampleRecipe2.id, sampleRecipe2);
recipes.set(sampleRecipe3.id, sampleRecipe3);

export function findRecipeById(id: string): Recipe | undefined {
  return recipes.get(id);
}

export function getAllPublicRecipes(): Recipe[] {
  return Array.from(recipes.values()).filter(r => r.isPublic);
}

export function getUserRecipes(userId: string): Recipe[] {
  return Array.from(recipes.values()).filter(r => r.authorId === userId);
}

export function findUserByEmail(email: string): User | undefined {
  return Array.from(users.values()).find(u => u.email === email);
}

export function findUserByUsername(username: string): User | undefined {
  return Array.from(users.values()).find(u => u.username === username);
}

export function findUserById(id: string): User | undefined {
  return users.get(id);
}

export function createUser(username: string, email: string, passwordHash: string): User {
  const user: User = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    pantry: [],
    shoppingList: [],
    savedRecipes: [],
  };
  users.set(user.id, user);
  return user;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchRecipesByPantry(pantry: Ingredient[], maxMissing: number = 2) {
  const pantryNames = new Set(pantry.map(i => normalizeIngredientName(i.name)));
  const allRecipes = getAllPublicRecipes();
  const results = [];

  for (const recipe of allRecipes) {
    const recipeIngredientNames = recipe.ingredients.map(i => normalizeIngredientName(i.name));
    const matched: string[] = [];
    const missing: Ingredient[] = [];

    for (const ing of recipe.ingredients) {
      if (pantryNames.has(normalizeIngredientName(ing.name))) {
        matched.push(ing.name);
      } else {
        missing.push(ing);
      }
    }

    if (missing.length <= maxMissing) {
      const matchPercentage = recipe.ingredients.length > 0
        ? Math.round((matched.length / recipe.ingredients.length) * 100)
        : 0;
      results.push({
        recipe,
        matchPercentage,
        matchedIngredients: matched,
        missingIngredients: missing,
      });
    }
  }

  results.sort((a, b) => b.matchPercentage - a.matchPercentage);
  return results;
}

export function generateShoppingList(
  selectedRecipeIds: string[],
  pantry: Ingredient[]
): ShoppingListItem[] {
  const pantryNames = new Set(pantry.map(i => normalizeIngredientName(i.name)));
  const ingredientMap = new Map<string, ShoppingListItem>();

  for (const recipeId of selectedRecipeIds) {
    const recipe = recipes.get(recipeId);
    if (!recipe) continue;

    for (const ing of recipe.ingredients) {
      if (!pantryNames.has(normalizeIngredientName(ing.name))) {
        const key = normalizeIngredientName(ing.name);
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.quantity += ing.quantity;
        } else {
          ingredientMap.set(key, {
            id: uuidv4(),
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            completed: false,
          });
        }
      }
    }
  }

  return Array.from(ingredientMap.values());
}
