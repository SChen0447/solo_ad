import { Recipe, RecipeSlot } from '../types'

export function serializePattern(pattern: (RecipeSlot | null)[]): string {
  return pattern
    .map((slot, index) => {
      if (!slot) return `${index}:empty`
      return `${index}:${slot.materialId}x${slot.quantity}`
    })
    .join('|')
}

export function matchRecipe(
  slots: (RecipeSlot | null)[],
  allRecipes: Recipe[]
): Recipe | null {
  const patternKey = serializePattern(slots)
  for (const recipe of allRecipes) {
    const recipeKey = serializePattern(recipe.pattern)
    if (patternKey === recipeKey) {
      return recipe
    }
  }
  return null
}

export function buildRecipePatternMap(
  recipes: Recipe[]
): Map<string, Recipe> {
  const map = new Map<string, Recipe>()
  for (const recipe of recipes) {
    const key = serializePattern(recipe.pattern)
    map.set(key, recipe)
  }
  return map
}

export function fastMatchRecipe(
  slots: (RecipeSlot | null)[],
  patternMap: Map<string, Recipe>
): Recipe | null {
  const key = serializePattern(slots)
  return patternMap.get(key) || null
}

export function getRecipeMaterialRequirements(
  recipe: Recipe,
  times: number = 1
): Map<string, number> {
  const requirements = new Map<string, number>()
  for (const slot of recipe.pattern) {
    if (slot) {
      const current = requirements.get(slot.materialId) || 0
      requirements.set(slot.materialId, current + slot.quantity * times)
    }
  }
  return requirements
}

export function checkInventorySufficient(
  requirements: Map<string, number>,
  inventory: Record<string, number>
): { sufficient: boolean; missing: Map<string, number> } {
  const missing = new Map<string, number>()
  let sufficient = true
  for (const [materialId, required] of requirements) {
    const available = inventory[materialId] || 0
    if (available < required) {
      sufficient = false
      missing.set(materialId, required - available)
    }
  }
  return { sufficient, missing }
}
