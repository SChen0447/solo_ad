import axios from 'axios';
import type { AuthResponse, Recipe, ShoppingList, User } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<{ user: User }>('/auth/me')
};

export const recipeApi = {
  getRecipes: () => api.get<{ recipes: Recipe[] }>('/recipes'),

  getRecipe: (id: number) => api.get<{ recipe: Recipe }>(`/recipes/${id}`),

  createRecipe: (data: Partial<Recipe>) =>
    api.post<{ recipe: Recipe }>('/recipes', data),

  updateRecipe: (id: number, data: Partial<Recipe>) =>
    api.put<{ recipe: Recipe }>(`/recipes/${id}`, data),

  deleteRecipe: (id: number) => api.delete(`/recipes/${id}`),

  rateRecipe: (id: number, rating: number) =>
    api.post<{ recipe: Recipe }>(`/recipes/${id}/rating`, { rating })
};

export const shoppingListApi = {
  generate: (recipeIds: number[]) =>
    api.post<{ shopping_list: ShoppingList }>('/shopping-list/generate', {
      recipe_ids: recipeIds
    }),

  getByShareCode: (shareCode: string) =>
    api.get<{ shopping_list: ShoppingList }>(`/shopping-list/${shareCode}`),

  updateItem: (shareCode: string, itemId: number, data: { checked?: boolean; note?: string }) =>
    api.put<{ item: ShoppingList['items'][0] }>(
      `/shopping-list/${shareCode}/items/${itemId}`,
      data
    ),

  join: (shareCode: string) =>
    api.post<{ shopping_list: ShoppingList }>(`/shopping-list/${shareCode}/join`)
};

export default api;
