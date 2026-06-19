export interface Ingredient {
  name: string
  amount: string
}

export interface Recipe {
  id: number
  name: string
  description: string
  emoji: string
  ingredients: Ingredient[]
  steps: string[]
}

export interface RecommendedRecipe extends Recipe {
  matchPercentage: number
  matchedCount: number
  totalIngredients: number
  matchedIngredients: string[]
}
