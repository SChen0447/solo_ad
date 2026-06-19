export interface Photo {
  id: string;
  url: string;
  order: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  balanceScore: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Record {
  id: string;
  date: string;
  mealType: MealType;
  photos: Photo[];
  comment: string;
  nutrition: Nutrition;
  createdAt: string;
}

export interface Tip {
  id: string;
  type: 'positive' | 'warning';
  content: string;
}

export interface WeeklySummary {
  dailyCalories: { date: string; calories: number }[];
  tips: Tip[];
  averageBalance: number;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: 'bg-orange-100 text-orange-600',
  lunch: 'bg-green-100 text-green-600',
  dinner: 'bg-orange-200 text-orange-700',
  snack: 'bg-green-200 text-green-700',
};
