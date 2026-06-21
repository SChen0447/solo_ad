import { Router, type Request, type Response } from 'express'
import { readJSONFile } from '../utils/fileStorage.js'
import type { InventoryItem, Recipe } from '../../shared/types.js'

const router = Router()
const RECIPES_FILE = 'recipes.json'
const INVENTORY_FILE = 'inventory.json'

router.get('/', (_req: Request, res: Response) => {
  try {
    const recipes = readJSONFile<Recipe[]>(RECIPES_FILE)
    res.json(recipes)
  } catch (error) {
    res.status(500).json({ success: false, error: '读取菜谱数据失败' })
  }
})

router.post('/recommend', (req: Request, res: Response) => {
  try {
    const recipes = readJSONFile<Recipe[]>(RECIPES_FILE)
    const inventory = readJSONFile<InventoryItem[]>(INVENTORY_FILE)

    const availableNames = new Set(
      inventory
        .filter((item) => {
          const expiry = new Date(item.expiryDate)
          const today = new Date()
          return expiry >= today || item.handled === false
        })
        .map((item) => item.name)
    )

    const scored = recipes.map((recipe) => {
      const matched = recipe.ingredients.filter(
        (ing) => availableNames.has(ing.name)
      ).length
      const requiredCount = recipe.ingredients.filter((ing) => ing.required).length
      const matchedRequired = recipe.ingredients.filter(
        (ing) => ing.required && availableNames.has(ing.name)
      ).length
      const score = requiredCount > 0 ? matchedRequired / requiredCount : 0
      return { recipe, score, matched }
    })

    const filtered = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.matched - a.matched || b.score - a.score)
      .slice(0, 5)
      .map((s) => s.recipe)

    const result = filtered.length > 0 ? filtered : recipes.slice(0, 3)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '推荐菜谱失败' })
  }
})

export default router
