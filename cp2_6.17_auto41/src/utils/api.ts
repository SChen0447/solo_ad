export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coverImage: string;
  isFavorite: boolean;
}

export interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
}

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export async function getRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
  return handleResponse<Recipe[]>(response);
}

export async function addRecipe(recipe: Omit<Recipe, 'id'>): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipe),
  });
  return handleResponse<Recipe>(response);
}

export async function updateRecipe(id: string, recipe: Partial<Recipe>): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipe),
  });
  return handleResponse<Recipe>(response);
}

export async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(response);
}

export async function getFridge(): Promise<FridgeItem[]> {
  const response = await fetch(`${API_BASE}/fridge`);
  return handleResponse<FridgeItem[]>(response);
}

export async function addFridgeItem(item: Omit<FridgeItem, 'id'>): Promise<FridgeItem> {
  const response = await fetch(`${API_BASE}/fridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  return handleResponse<FridgeItem>(response);
}

export async function deleteFridgeItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/fridge/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(response);
}

export async function toggleFavorite(id: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes/${id}/favorite`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<Recipe>(response);
}
