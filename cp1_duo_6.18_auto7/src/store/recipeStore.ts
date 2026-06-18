import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Ingredient, ShoppingGroup } from '../types';
import { mergeIngredients, groupByCategory } from '../utils/ingredientUtils';

interface RecipeState {
  recipes: Recipe[];
  shoppingGroups: ShoppingGroup[];
  shoppingCompletedMap: Record<string, boolean>;

  addRecipe: (recipe: Omit<Recipe, 'id' | 'scaleFactor' | 'selected'>) => void;
  deleteRecipe: (id: string) => void;
  updateScaleFactor: (id: string, factor: number) => void;
  toggleRecipeSelected: (id: string) => void;

  generateShoppingList: () => void;
  toggleShoppingItem: (name: string, unit: string) => void;
  toggleGroupCollapsed: (category: string) => void;
  clearShoppingList: () => void;
}

const sampleRecipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '番茄炒蛋',
    cookTime: 15,
    difficulty: '简单',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20tomato%20egg%20stir%20fry%20dish%20delicious%20food%20photography&image_size=square',
    ingredients: [
      { name: '番茄', amount: 2, unit: '个' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '葱', amount: 1, unit: '根' },
      { name: '盐', amount: 0.5, unit: '勺' },
      { name: '糖', amount: 1, unit: '勺' },
      { name: '食用油', amount: 2, unit: '勺' },
    ],
    steps: [
      '番茄洗净切块，鸡蛋打散，葱切葱花',
      '热锅倒油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入番茄翻炒出汁',
      '加入盐和糖调味，炒至番茄软烂',
      '倒入炒好的鸡蛋翻炒均匀',
      '撒上葱花出锅即可',
    ],
    scaleFactor: 1,
    selected: false,
  },
  {
    id: uuidv4(),
    name: '红烧肉',
    cookTime: 90,
    difficulty: '中等',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20braised%20pork%20belly%20hongshao%20rou%20delicious%20food%20photography&image_size=square',
    ingredients: [
      { name: '猪肉', amount: 500, unit: '克' },
      { name: '生姜', amount: 3, unit: '片' },
      { name: '葱', amount: 2, unit: '根' },
      { name: '八角', amount: 2, unit: '个' },
      { name: '桂皮', amount: 1, unit: '小块' },
      { name: '生抽', amount: 2, unit: '勺' },
      { name: '老抽', amount: 1, unit: '勺' },
      { name: '料酒', amount: 2, unit: '勺' },
      { name: '糖', amount: 2, unit: '勺' },
      { name: '盐', amount: 0.5, unit: '勺' },
    ],
    steps: [
      '五花肉切块，冷水下锅焯水，撇去浮沫捞出',
      '锅中不放油，放入肉块小火煎出油脂',
      '加入糖小火炒出糖色',
      '加入葱姜、八角、桂皮炒香',
      '加入料酒、生抽、老抽翻炒均匀',
      '加入热水没过肉块，大火烧开后转小火炖60分钟',
      '大火收汁，加盐调味即可',
    ],
    scaleFactor: 1,
    selected: false,
  },
  {
    id: uuidv4(),
    name: '清炒时蔬',
    cookTime: 10,
    difficulty: '简单',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=stir%20fried%20green%20vegetables%20chinese%20style%20healthy%20food%20photography&image_size=square',
    ingredients: [
      { name: '青菜', amount: 300, unit: '克' },
      { name: '大蒜', amount: 3, unit: '瓣' },
      { name: '盐', amount: 0.5, unit: '勺' },
      { name: '食用油', amount: 1, unit: '勺' },
    ],
    steps: [
      '青菜洗净沥干水分，大蒜切片',
      '热锅倒油，放入蒜片爆香',
      '放入青菜大火快炒',
      '加盐调味，翻炒均匀即可出锅',
    ],
    scaleFactor: 1,
    selected: false,
  },
];

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
      recipes: sampleRecipes,
      shoppingGroups: [],
      shoppingCompletedMap: {},

      addRecipe: (recipeData) => {
        const newRecipe: Recipe = {
          ...recipeData,
          id: uuidv4(),
          scaleFactor: 1,
          selected: false,
        };
        set((state) => ({ recipes: [newRecipe, ...state.recipes] }));
      },

      deleteRecipe: (id) => {
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
        }));
      },

      updateScaleFactor: (id, factor) => {
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id ? { ...r, scaleFactor: Math.max(0.1, factor) } : r
          ),
        }));
      },

      toggleRecipeSelected: (id) => {
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id ? { ...r, selected: !r.selected } : r
          ),
        }));
      },

      generateShoppingList: () => {
        const { recipes, shoppingCompletedMap } = get();
        const selectedRecipes = recipes.filter((r) => r.selected);

        const allIngredients: Ingredient[] = [];
        for (const recipe of selectedRecipes) {
          for (const ing of recipe.ingredients) {
            allIngredients.push({
              ...ing,
              amount: ing.amount * recipe.scaleFactor,
            });
          }
        }

        const merged = mergeIngredients(allIngredients);
        const groups = groupByCategory(merged, shoppingCompletedMap);
        set({ shoppingGroups: groups });
      },

      toggleShoppingItem: (name, unit) => {
        const key = `${name}|${unit}`;
        set((state) => {
          const newCompletedMap = {
            ...state.shoppingCompletedMap,
            [key]: !state.shoppingCompletedMap[key],
          };

          const newGroups = state.shoppingGroups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.name === name && item.unit === unit
                ? { ...item, completed: !item.completed }
                : item
            ),
          }));

          return {
            shoppingCompletedMap: newCompletedMap,
            shoppingGroups: newGroups,
          };
        });
      },

      toggleGroupCollapsed: (category) => {
        set((state) => ({
          shoppingGroups: state.shoppingGroups.map((g) =>
            g.category === category ? { ...g, collapsed: !g.collapsed } : g
          ),
        }));
      },

      clearShoppingList: () => {
        set({ shoppingGroups: [], shoppingCompletedMap: {} });
      },
    }),
    {
      name: 'recipe-shopping-storage',
    }
  )
);
