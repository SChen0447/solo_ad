import { create } from 'zustand';
import type { Recipe, ShoppingItem, ActivityLog, Collaborator, User, OptimizationResult } from '@/types';

interface ProjectState {
  projectId: string;
  projectName: string;
  recipes: Recipe[];
  shoppingList: ShoppingItem[];
  logs: ActivityLog[];
  collaborators: Collaborator[];
  currentUser: User | null;
  optimizationResult: OptimizationResult | null;
  isShoppingListOpen: boolean;
  isLogPanelOpen: boolean;
  editingRecipeId: string | null;
  highlightedIngredients: string[];

  setProjectId: (id: string) => void;
  setProjectName: (name: string) => void;
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;
  setShoppingList: (list: ShoppingItem[]) => void;
  updateShoppingListItem: (item: ShoppingItem) => void;
  setLogs: (logs: ActivityLog[]) => void;
  addLog: (log: ActivityLog) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  updateCollaborator: (collaborator: Collaborator) => void;
  setCurrentUser: (user: User) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  setIsShoppingListOpen: (open: boolean) => void;
  setIsLogPanelOpen: (open: boolean) => void;
  setEditingRecipeId: (id: string | null) => void;
  highlightIngredient: (name: string) => void;
  clearHighlight: (name: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: 'default',
  projectName: '周末聚餐计划',
  recipes: [],
  shoppingList: [],
  logs: [],
  collaborators: [],
  currentUser: null,
  optimizationResult: null,
  isShoppingListOpen: false,
  isLogPanelOpen: true,
  editingRecipeId: null,
  highlightedIngredients: [],

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setRecipes: (recipes) => set({ recipes }),
  addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
  updateRecipe: (recipe) => set((state) => ({
    recipes: state.recipes.map((r) => (r.id === recipe.id ? recipe : r))
  })),
  deleteRecipe: (recipeId) => set((state) => ({
    recipes: state.recipes.filter((r) => r.id !== recipeId)
  })),
  setShoppingList: (list) => set({ shoppingList: list }),
  updateShoppingListItem: (item) => set((state) => ({
    shoppingList: state.shoppingList.map((i) =>
      i.name === item.name ? { ...item, isHighlighted: true } : i
    )
  })),
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 50) })),
  setCollaborators: (collaborators) => set({ collaborators }),
  updateCollaborator: (collaborator) => set((state) => ({
    collaborators: state.collaborators.map((c) =>
      c.id === collaborator.id ? collaborator : c
    )
  })),
  setCurrentUser: (user) => set({ currentUser: user }),
  setOptimizationResult: (result) => set({ optimizationResult: result }),
  setIsShoppingListOpen: (open) => set({ isShoppingListOpen: open }),
  setIsLogPanelOpen: (open) => set({ isLogPanelOpen: open }),
  setEditingRecipeId: (id) => set({ editingRecipeId: id }),
  highlightIngredient: (name) => set((state) => ({
    highlightedIngredients: [...state.highlightedIngredients, name]
  })),
  clearHighlight: (name) => set((state) => ({
    highlightedIngredients: state.highlightedIngredients.filter((n) => n !== name)
  }))
}));
