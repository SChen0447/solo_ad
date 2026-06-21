import type { FamilyMember, Ingredient, Recipe, RecommendedRecipe, NewIngredient, NewFamilyMember } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json();
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  return request<FamilyMember[]>('/family');
}

export async function addFamilyMember(member: NewFamilyMember): Promise<FamilyMember> {
  return request<FamilyMember>('/family', {
    method: 'POST',
    body: JSON.stringify(member),
  });
}

export async function updateFamilyMember(id: string, member: Partial<NewFamilyMember>): Promise<FamilyMember> {
  return request<FamilyMember>(`/family/${id}`, {
    method: 'PUT',
    body: JSON.stringify(member),
  });
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await request<void>(`/family/${id}`, {
    method: 'DELETE',
  });
}

export async function getInventory(): Promise<Ingredient[]> {
  return request<Ingredient[]>('/inventory');
}

export async function addIngredient(ingredient: NewIngredient): Promise<Ingredient> {
  return request<Ingredient>('/inventory', {
    method: 'POST',
    body: JSON.stringify(ingredient),
  });
}

export async function updateIngredient(id: string, ingredient: Partial<NewIngredient>): Promise<Ingredient> {
  return request<Ingredient>(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ingredient),
  });
}

export async function deleteIngredient(id: string): Promise<void> {
  await request<void>(`/inventory/${id}`, {
    method: 'DELETE',
  });
}

export async function getRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>('/recipes');
}

export async function getRecipeById(id: string): Promise<Recipe> {
  return request<Recipe>(`/recipes/${id}`);
}

export async function getRecommendations(keyword: string = '', onlyAvailable: boolean = false): Promise<RecommendedRecipe[]> {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (onlyAvailable) params.set('onlyAvailable', 'true');
  return request<RecommendedRecipe[]>(`/recommend?${params.toString()}`);
}
