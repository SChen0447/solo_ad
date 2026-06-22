import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { Recipe, Step, ShoppingItem, CuisineType, Ingredient } from './types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '红烧肉',
    cuisine: 'chinese',
    ingredients: [
      { id: uuidv4(), name: '五花肉', quantity: 500, unit: 'g' },
      { id: uuidv4(), name: '生抽', quantity: 2, unit: '勺' },
      { id: uuidv4(), name: '老抽', quantity: 1, unit: '勺' },
      { id: uuidv4(), name: '冰糖', quantity: 30, unit: 'g' },
      { id: uuidv4(), name: '姜片', quantity: 5, unit: '片' }
    ],
    steps: [
      { id: uuidv4(), stepNumber: 1, description: '五花肉切块，冷水下锅焯水', estimatedTime: 10, completed: false },
      { id: uuidv4(), stepNumber: 2, description: '锅中放油，加入冰糖炒糖色', estimatedTime: 5, completed: false },
      { id: uuidv4(), stepNumber: 3, description: '放入五花肉翻炒上色', estimatedTime: 8, completed: false },
      { id: uuidv4(), stepNumber: 4, description: '加入生抽老抽和水，小火炖煮40分钟', estimatedTime: 40, completed: false },
      { id: uuidv4(), stepNumber: 5, description: '大火收汁，出锅装盘', estimatedTime: 5, completed: false }
    ],
    assignee: '小明'
  },
  {
    id: uuidv4(),
    name: '意大利面',
    cuisine: 'western',
    ingredients: [
      { id: uuidv4(), name: '意面', quantity: 200, unit: 'g' },
      { id: uuidv4(), name: '番茄酱', quantity: 100, unit: 'g' },
      { id: uuidv4(), name: '洋葱', quantity: 1, unit: '个' },
      { id: uuidv4(), name: '大蒜', quantity: 3, unit: '瓣' },
      { id: uuidv4(), name: '橄榄油', quantity: 2, unit: '勺' }
    ],
    steps: [
      { id: uuidv4(), stepNumber: 1, description: '烧开水，加盐，煮意面', estimatedTime: 12, completed: false },
      { id: uuidv4(), stepNumber: 2, description: '洋葱大蒜切碎，橄榄油炒香', estimatedTime: 5, completed: false },
      { id: uuidv4(), stepNumber: 3, description: '加入番茄酱熬煮', estimatedTime: 10, completed: false },
      { id: uuidv4(), stepNumber: 4, description: '意面捞出拌入酱汁，撒上奶酪', estimatedTime: 3, completed: false }
    ],
    assignee: '小红'
  },
  {
    id: uuidv4(),
    name: '寿司拼盘',
    cuisine: 'japanese',
    ingredients: [
      { id: uuidv4(), name: '寿司米', quantity: 300, unit: 'g' },
      { id: uuidv4(), name: '三文鱼', quantity: 200, unit: 'g' },
      { id: uuidv4(), name: '海苔', quantity: 4, unit: '片' },
      { id: uuidv4(), name: '寿司醋', quantity: 3, unit: '勺' },
      { id: uuidv4(), name: '黄瓜', quantity: 1, unit: '根' }
    ],
    steps: [
      { id: uuidv4(), stepNumber: 1, description: '寿司米洗净浸泡30分钟', estimatedTime: 30, completed: false },
      { id: uuidv4(), stepNumber: 2, description: '米饭蒸熟，拌入寿司醋冷却', estimatedTime: 20, completed: false },
      { id: uuidv4(), stepNumber: 3, description: '三文鱼切片，黄瓜切条', estimatedTime: 10, completed: false },
      { id: uuidv4(), stepNumber: 4, description: '海苔铺米饭，放入配料卷起切段', estimatedTime: 15, completed: false },
      { id: uuidv4(), stepNumber: 5, description: '摆盘，配上芥末和酱油', estimatedTime: 5, completed: false }
    ],
    assignee: '小李'
  }
]

let purchasedItems: Set<string> = new Set()

app.get('/api/recipes', (req, res) => {
  res.json(recipes)
})

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  res.json(recipe)
})

app.post('/api/recipes', (req, res) => {
  const { name, cuisine, ingredients, steps } = req.body
  const newRecipe: Recipe = {
    id: uuidv4(),
    name,
    cuisine: cuisine as CuisineType,
    ingredients: ingredients.map((ing: Omit<Ingredient, 'id'>) => ({
      ...ing,
      id: uuidv4()
    })),
    steps: steps.map((step: Omit<Step, 'id' | 'completed'>) => ({
      ...step,
      id: uuidv4(),
      completed: false
    }))
  }
  recipes.push(newRecipe)
  res.status(201).json(newRecipe)
})

app.put('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  const { name, cuisine, ingredients, steps, assignee } = req.body
  recipes[index] = {
    ...recipes[index],
    name: name ?? recipes[index].name,
    cuisine: cuisine ?? recipes[index].cuisine,
    ingredients: ingredients ? ingredients.map((ing: Ingredient) => ({ ...ing, id: ing.id || uuidv4() })) : recipes[index].ingredients,
    steps: steps ? steps.map((step: Step) => ({ ...step, id: step.id || uuidv4() })) : recipes[index].steps,
    assignee: assignee !== undefined ? assignee : recipes[index].assignee
  }
  res.json(recipes[index])
})

app.delete('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  recipes.splice(index, 1)
  res.status(204).send()
})

app.put('/api/recipes/:id/steps/:stepId', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  const step = recipe.steps.find(s => s.id === req.params.stepId)
  if (!step) {
    return res.status(404).json({ error: 'Step not found' })
  }
  const { completed, actualTime } = req.body
  step.completed = completed !== undefined ? completed : step.completed
  step.actualTime = actualTime !== undefined ? actualTime : step.actualTime
  
  const allCompleted = recipe.steps.every(s => s.completed)
  recipe.completed = allCompleted
  
  res.json({ step, allCompleted })
})

app.put('/api/recipes/:id/assignee', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  const { assignee } = req.body
  recipe.assignee = assignee
  res.json(recipe)
})

app.get('/api/shopping-list', (req, res) => {
  const ingredientMap = new Map<string, { name: string; quantity: number; unit: string }>()
  
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = `${ing.name}-${ing.unit}`
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!
        existing.quantity += ing.quantity
      } else {
        ingredientMap.set(key, {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })
      }
    }
  }
  
  const shoppingList: ShoppingItem[] = Array.from(ingredientMap.entries()).map(([key, item]) => ({
    id: key,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    purchased: purchasedItems.has(key)
  }))
  
  res.json(shoppingList)
})

app.put('/api/shopping-list/:id/purchase', (req, res) => {
  const { purchased } = req.body
  const itemId = req.params.id
  
  if (purchased) {
    purchasedItems.add(itemId)
  } else {
    purchasedItems.delete(itemId)
  }
  
  res.json({ id: itemId, purchased })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
