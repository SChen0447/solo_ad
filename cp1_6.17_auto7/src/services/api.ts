import axios from 'axios';
import type { Recipe, DailyTracker, DietGoal } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const searchRecipes = async (
  ingredients: string[],
  dietGoal: DietGoal
): Promise<Recipe[]> => {
  const response = await api.post('/recipes/search', {
    ingredients,
    diet_goal: dietGoal
  });
  return response.data.data;
};

export const analyzeRecipe = async (
  recipeId: number,
  action: 'view' | 'favorite'
): Promise<DailyTracker> => {
  const response = await api.post('/recipes/analyze', {
    recipe_id: recipeId,
    action
  });
  return response.data.tracker;
};

export const getFavorites = async (): Promise<Recipe[]> => {
  const response = await api.get('/recipes/favorites');
  return response.data.data.map((item: { recipe_data: Recipe }) => item.recipe_data);
};

export const toggleFavorite = async (recipe: Recipe): Promise<boolean> => {
  const response = await api.post('/recipes/favorites', {
    recipe_id: recipe.id,
    recipe_data: recipe
  });
  return response.data.favorited;
};

export const getTrackerStatus = async (): Promise<DailyTracker> => {
  const response = await api.get('/tracker/status');
  return response.data.data;
};

export const clearTracker = async (): Promise<DailyTracker> => {
  const response = await api.post('/tracker/clear');
  return response.data.data;
};

export const exportTrackerCSV = (): string => {
  return '/api/tracker/export';
};
