import axios from 'axios';
import type { Recipe, RecipeCreateDTO, RecipeListResponse } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const fetchRecipes = (page = 1, limit = 8) =>
  api.get<RecipeListResponse>('/recipes', { params: { page, limit } }).then(r => r.data);

export const fetchRecipe = (id: number) =>
  api.get<Recipe>(`/recipes/${id}`).then(r => r.data);

export const createRecipe = (data: RecipeCreateDTO) =>
  api.post<Recipe>('/recipes', data).then(r => r.data);

export const updateRecipe = (id: number, data: Partial<RecipeCreateDTO>) =>
  api.put<Recipe>(`/recipes/${id}`, data).then(r => r.data);

export const removeRecipe = (id: number) =>
  api.delete(`/recipes/${id}`).then(r => r.data);

export const likeRecipe = (id: number) =>
  api.post<{ likes: number }>(`/recipes/${id}/like`).then(r => r.data);

export const setFavorite = (id: number, favorite: boolean) =>
  api.post<{ isFavorite: boolean }>(`/recipes/${id}/favorite`, { favorite }).then(r => r.data);

export const fetchFavorites = () =>
  api.get<Recipe[]>('/favorites').then(r => r.data);
