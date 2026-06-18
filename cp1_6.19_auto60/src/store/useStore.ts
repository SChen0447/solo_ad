import { create } from 'zustand';

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  difficulty: string;
  cookTime: number;
  icon: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  matchPercentage?: number;
  missingIngredients?: string[];
}

interface AppState {
  inventory: Ingredient[];
  recommendations: Recipe[];
  favorites: Recipe[];
  currentPage: 'inventory' | 'recommend';
  selectedRecipe: Recipe | null;
  setCurrentPage: (page: 'inventory' | 'recommend') => void;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  setInventory: (inventory: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, data: Partial<Ingredient>) => void;
  removeIngredient: (id: string) => void;
  setRecommendations: (recipes: Recipe[]) => void;
  toggleFavorite: (recipe: Recipe) => void;
  isFavorite: (recipeId: string) => boolean;
}

export const useStore = create<AppState>((set, get) => ({
  inventory: [],
  recommendations: [],
  favorites: [],
  currentPage: 'inventory',
  selectedRecipe: null,

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),

  setInventory: (inventory) => set({ inventory }),

  addIngredient: (ingredient) =>
    set((state) => ({ inventory: [...state.inventory, ingredient] })),

  updateIngredient: (id, data) =>
    set((state) => ({
      inventory: state.inventory.map((item) =>
        item.id === id ? { ...item, ...data } : item,
      ),
    })),

  removeIngredient: (id) =>
    set((state) => ({
      inventory: state.inventory.filter((item) => item.id !== id),
    })),

  setRecommendations: (recipes) => set({ recommendations: recipes }),

  toggleFavorite: (recipe) =>
    set((state) => {
      const exists = state.favorites.find((f) => f.id === recipe.id);
      if (exists) {
        return {
          favorites: state.favorites.filter((f) => f.id !== recipe.id),
        };
      }
      return { favorites: [...state.favorites, recipe] };
    }),

  isFavorite: (recipeId) => get().favorites.some((f) => f.id === recipeId),
}));
