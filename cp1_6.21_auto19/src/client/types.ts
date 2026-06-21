export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface RecipeStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  order: number;
}

export interface Recipe {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  cuisine: 'chinese' | 'japanese' | 'western' | 'other';
  ingredients: string[];
  steps: RecipeStep[];
  totalTime: number;
  authorId: string;
  authorName: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  averageRating?: number;
  ratingCount?: number;
}

export interface CookingSession {
  id: string;
  recipeId: string;
  recipeTitle: string;
  stepId: string;
  stepName: string;
  startTime: number;
  duration: number;
  remainingTime: number;
  userId: string;
  userName: string;
  isActive: boolean;
  viewers: string[];
}

export interface CookingHistory {
  id: string;
  userId: string;
  recipeId: string;
  recipeTitle: string;
  completedAt: number;
}

export type CuisineType = 'all' | 'chinese' | 'japanese' | 'western' | 'other';

export type SortType = 'newest' | 'rating';
