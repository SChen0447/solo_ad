import { useState, useEffect, useCallback } from 'react';
import type { Recipe, DailyTracker, DietGoal } from '../types';
import {
  searchRecipes,
  analyzeRecipe,
  getFavorites,
  toggleFavorite,
  getTrackerStatus,
  clearTracker
} from '../services/api';

const GOALS = {
  calories: 2000,
  protein: 100,
  fat: 65,
  carbs: 250
};

export function useAppState() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [tracker, setTracker] = useState<DailyTracker | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchIngredients, setSearchIngredients] = useState<string[]>([]);
  const [dietGoal, setDietGoal] = useState<DietGoal>('balanced');

  const loadTracker = useCallback(async () => {
    try {
      const data = await getTrackerStatus();
      setTracker(data);
    } catch (err) {
      console.error('Failed to load tracker:', err);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  useEffect(() => {
    loadTracker();
    loadFavorites();
    const interval = setInterval(loadTracker, 300000);
    return () => clearInterval(interval);
  }, [loadTracker, loadFavorites]);

  const handleSearch = useCallback(
    async (ingredients: string[], goal: DietGoal) => {
      setLoading(true);
      setSearchIngredients(ingredients);
      setDietGoal(goal);
      try {
        const results = await searchRecipes(ingredients, goal);
        setRecipes(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleRecipeView = useCallback(
    async (recipeId: number) => {
      try {
        const updatedTracker = await analyzeRecipe(recipeId, 'view');
        setTracker({
          ...updatedTracker,
          recipes: updatedTracker.recipes || []
        });
      } catch (err) {
        console.error('Failed to track recipe:', err);
      }
    },
    []
  );

  const handleToggleFavorite = useCallback(
    async (recipe: Recipe): Promise<boolean> => {
      try {
        const isFav = await toggleFavorite(recipe);
        if (isFav) {
          setFavorites((prev) => {
            if (prev.some((r) => r.id === recipe.id)) return prev;
            return [...prev, recipe];
          });
          const updatedTracker = await analyzeRecipe(recipe.id, 'favorite');
          setTracker({
            ...updatedTracker,
            recipes: updatedTracker.recipes || []
          });
        } else {
          setFavorites((prev) => prev.filter((r) => r.id !== recipe.id));
        }
        return isFav;
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
        return false;
      }
    },
    []
  );

  const handleClearTracker = useCallback(async () => {
    try {
      const data = await clearTracker();
      setTracker(data);
    } catch (err) {
      console.error('Failed to clear tracker:', err);
    }
  }, []);

  const refreshTracker = useCallback(async () => {
    await loadTracker();
  }, [loadTracker]);

  const isFavorite = useCallback(
    (recipeId: number): boolean => {
      return favorites.some((r) => r.id === recipeId);
    },
    [favorites]
  );

  return {
    recipes,
    favorites,
    tracker,
    loading,
    searchIngredients,
    dietGoal,
    goals: GOALS,
    handleSearch,
    handleRecipeView,
    handleToggleFavorite,
    handleClearTracker,
    refreshTracker,
    isFavorite
  };
}
