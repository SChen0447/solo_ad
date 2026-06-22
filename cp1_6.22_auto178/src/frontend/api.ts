import axios from 'axios';
import { Recipe, Ingredient, ShoppingListItem, RecommendedRecipe, User } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
};

export const recipesAPI = {
  getAll: (params?: { search?: string; category?: string; tag?: string }) =>
    api.get<Recipe[]>('/recipes', { params }),
  getById: (id: string) => api.get<Recipe>(`/recipes/${id}`),
  getMy: () => api.get('/recipes/my'),
  create: (data: Partial<Recipe>) => api.post<Recipe>('/recipes', data),
  update: (id: string, data: Partial<Recipe>) => api.put<Recipe>(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  save: (id: string) => api.post(`/recipes/${id}/save`),
  unsave: (id: string) => api.post(`/recipes/${id}/unsave`),
};

export const ingredientsAPI = {
  getCategories: () => api.get<string[]>('/ingredients/categories'),
  getPantry: () => api.get<Ingredient[]>('/ingredients/pantry'),
  addPantry: (data: Partial<Ingredient>) =>
    api.post<Ingredient>('/ingredients/pantry', data),
  updatePantry: (id: string, data: Partial<Ingredient>) =>
    api.put<Ingredient>(`/ingredients/pantry/${id}`, data),
  deletePantry: (id: string) => api.delete(`/ingredients/pantry/${id}`),
  recommend: (pantry: Ingredient[], maxMissing?: number) =>
    api.post<RecommendedRecipe[]>('/ingredients/recommend', { pantry, maxMissing }),
  getShoppingList: () => api.get<ShoppingListItem[]>('/ingredients/shopping-list'),
  generateShoppingList: (recipeIds: string[]) =>
    api.post<ShoppingListItem[]>('/ingredients/shopping-list/generate', { recipeIds }),
  updateShoppingItem: (id: string, data: Partial<ShoppingListItem>) =>
    api.put<ShoppingListItem>(`/ingredients/shopping-list/${id}`, data),
  deleteShoppingItem: (id: string) => api.delete(`/ingredients/shopping-list/${id}`),
  clearShoppingList: () => api.post('/ingredients/shopping-list/clear'),
};
