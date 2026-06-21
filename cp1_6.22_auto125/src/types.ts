export interface FamilyMember {
  id: string;
  name: string;
  preferences: string[];
  allergens: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
}

export interface RecommendedRecipe extends Recipe {
  matchScore: number;
  matchedIngredients: number;
  totalIngredients: number;
}

export interface NewIngredient {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
}

export interface NewFamilyMember {
  name: string;
  preferences: string[];
  allergens: string[];
}
