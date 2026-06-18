import { create } from 'zustand';
import type { Recipe, CreateRecipeRequest, NutritionTotal, ToastMessage } from '../types';
import { calculateNutritionForRecipe } from '../utils/nutrition';
import { v4 as uuidv4 } from 'uuid';

interface RecipeState {
  recipes: Recipe[];
  searchQuery: string;
  selectedRecipe: Recipe | null;
  loading: boolean;
  portions: Record<string, number>;
  toasts: ToastMessage[];
  fetchRecipes: () => Promise<void>;
  fetchRecipeById: (id: string) => Promise<void>;
  createRecipe: (data: CreateRecipeRequest) => Promise<Recipe | null>;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setPortions: (recipeId: string, portions: number) => void;
  getPortions: (recipeId: string) => number;
  getFilteredRecipes: () => Recipe[];
  calculateNutrition: (recipe: Recipe, portions: number) => NutritionTotal;
  showToast: (text: string) => void;
  removeToast: (id: string) => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  searchQuery: '',
  selectedRecipe: null,
  loading: false,
  portions: {},
  toasts: [],

  fetchRecipes: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      set({ recipes: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchRecipeById: async (id: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/recipes/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        set({ selectedRecipe: data, loading: false });
      } else {
        set({ selectedRecipe: null, loading: false });
      }
    } catch {
      set({ loading: false, selectedRecipe: null });
    }
  },

  createRecipe: async (data: CreateRecipeRequest) => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newRecipe = await res.json();
      if (newRecipe && !newRecipe.error) {
        set(state => ({
          recipes: [newRecipe, ...state.recipes],
        }));
        get().showToast('食谱创建成功！');
        return newRecipe;
      }
      return null;
    } catch {
      return null;
    }
  },

  toggleFavorite: (id: string) => {
    set(state => ({
      recipes: state.recipes.map(r =>
        r.id === id ? { ...r, favorite: !r.favorite } : r
      ),
      selectedRecipe:
        state.selectedRecipe?.id === id
          ? { ...state.selectedRecipe, favorite: !state.selectedRecipe.favorite }
          : state.selectedRecipe,
    }));
    const recipe = get().recipes.find(r => r.id === id);
    if (recipe?.favorite) {
      get().showToast('已收藏');
    }
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),

  setPortions: (recipeId: string, portions: number) => {
    const clamped = Math.max(1, Math.min(10, portions));
    set(state => ({
      portions: { ...state.portions, [recipeId]: clamped },
    }));
  },

  getPortions: (recipeId: string) => {
    return get().portions[recipeId] || 1;
  },

  getFilteredRecipes: () => {
    const { recipes, searchQuery } = get();
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(r => r.title.toLowerCase().includes(q));
  },

  calculateNutrition: (recipe: Recipe, portions: number) => {
    return calculateNutritionForRecipe(recipe, portions);
  },

  showToast: (text: string) => {
    const id = uuidv4();
    set(state => ({
      toasts: [...state.toasts, { id, text }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 2500);
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },
}));
