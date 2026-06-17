export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

export interface Ingredient {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeStep {
  id?: number;
  content: string;
  order: number;
}

export interface Recipe {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  difficulty: number;
  rating: number;
  rating_count: number;
  servings: number;
  cook_time: number;
  created_at: string;
  updated_at: string;
  author: User;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

export interface ShoppingListItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  note: string;
}

export interface ShoppingList {
  id: number;
  share_code: string;
  name: string;
  created_at: string;
  updated_at: string;
  owner: User;
  items: ShoppingListItem[];
  collaborators: { user: User; joined_at: string }[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
