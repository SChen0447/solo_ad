import { Recipe, Ingredient, NutritionTotal } from '../types';

export function calculateNutritionForRecipe(recipe: Recipe, portions: number = 1): NutritionTotal {
  let calories = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  recipe.ingredients.forEach((ing: Ingredient) => {
    const factor = (ing.amount / 100) * portions;
    calories += ing.caloriesPer100g * factor;
    protein += ing.proteinPer100g * factor;
    fat += ing.fatPer100g * factor;
    carbs += ing.carbsPer100g * factor;
  });

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  };
}

export function getColorForValueChange(oldVal: number, newVal: number): string {
  if (newVal > oldVal) return '#E53935';
  if (newVal < oldVal) return '#43A047';
  return '#3E2723';
}
