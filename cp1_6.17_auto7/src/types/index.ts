export interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  tags: string[];
  image_url: string;
}

export interface DailyTracker {
  id: number;
  track_date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  recipes: TrackerRecipe[];
}

export interface TrackerRecipe {
  id: number;
  tracker_id: number;
  recipe_id: number;
  recipe_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  added_at: string;
}

export type DietGoal = 'balanced' | 'low_cal' | 'high_protein' | 'vegetarian';

export interface AppState {
  recipes: Recipe[];
  favorites: Recipe[];
  tracker: DailyTracker | null;
  loading: boolean;
  searchIngredients: string[];
  dietGoal: DietGoal;
}
