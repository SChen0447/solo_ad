import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Recipe, Step, ShoppingItem, CuisineType, Ingredient } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REQUIRED_FILES = [
  'package.json',
  'vite.config.js',
  'tsconfig.json',
  'index.html',
  'src/types.ts',
  'src/main.tsx',
  'src/App.tsx',
  'src/server.ts',
  'src/styles.css',
  'src/components/RecipeCard.tsx',
  'src/components/ShoppingList.tsx',
  'src/components/ProgressPanel.tsx'
]

function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const projectRoot = path.resolve(__dirname, '..')

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(projectRoot, file)
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file: ${file}`)
    }
  }

  const srcDir = path.join(projectRoot, 'src')
  if (!fs.existsSync(srcDir)) {
    errors.push('Missing src/ directory')
  }

  const componentsDir = path.join(projectRoot, 'src', 'components')
  if (!fs.existsSync(componentsDir)) {
    errors.push('Missing src/components/ directory')
  }

  const nodeModules = path.join(projectRoot, 'node_modules')
  if (!fs.existsSync(nodeModules)) {
    warnings.push('node_modules/ not found - run npm install first')
  }

  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const requiredDeps = ['react', 'react-dom', 'express', 'cors', 'uuid']
      for (const dep of requiredDeps) {
        if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
          warnings.push(`Missing dependency: ${dep}`)
        }
      }
    } catch {
      errors.push('package.json is not valid JSON')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

const envCheck = validateEnvironment()
if (!envCheck.valid) {
  console.error('❌ Environment validation failed:')
  envCheck.errors.forEach(e => console.error(`  - ${e}`))
  process.exit(1)
}
if (envCheck.warnings.length > 0) {
  console.warn('⚠️  Environment warnings:')
  envCheck.warnings.forEach(w => console.warn(`  - ${w}`))
}
console.log('✅ Environment validation passed')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

interface RecipeWithMaps extends Recipe {
  stepMap: Map<string, Step>
}

const recipeMap = new Map<string, RecipeWithMaps>()
const purchasedItems: Set<string> = new Set()

let shoppingListCache: ShoppingItem[] | null = null
let shoppingListDirty = true

const invalidateShoppingCache = () => {
  shoppingListDirty = true
}

const recipeToRecipeWithMaps = (recipe: Recipe): RecipeWithMaps => {
  const stepMap = new Map<string, Step>()
  for (const step of recipe.steps) {
    stepMap.set(step.id, step)
  }
  return { ...recipe, stepMap }
}

const recipeWithMapsToRecipe = (recipe: RecipeWithMaps): Recipe => {
  const { stepMap, ...rest } = recipe
  return rest
}

const addRecipeToMap = (recipe: Recipe): RecipeWithMaps => {
  const recipeWithMaps = recipeToRecipeWithMaps(recipe)
  recipeMap.set(recipe.id, recipeWithMaps)
  invalidateShoppingCache()
  return recipeWithMaps
}

const initSampleData = () => {
  const sampleRecipes: Recipe[] = [
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

  for (const recipe of sampleRecipes) {
    addRecipeToMap(recipe)
  }
}

const generateTestData = (recipeCount: number, avgIngredientsPerRecipe: number) => {
  const cuisines: CuisineType[] = ['chinese', 'western', 'japanese', 'other']
  const ingredientNames = [
    '猪肉', '牛肉', '鸡肉', '鱼肉', '虾', '鸡蛋', '豆腐',
    '米饭', '面条', '面粉', '土豆', '胡萝卜', '白菜', '青菜',
    '西红柿', '黄瓜', '洋葱', '大蒜', '生姜', '葱',
    '酱油', '盐', '糖', '醋', '料酒', '蚝油', '生抽', '老抽',
    '橄榄油', '花生油', '芝麻油', '番茄酱', '豆瓣酱', '辣椒酱',
    '奶酪', '牛奶', '黄油', '奶油', '面粉', '淀粉',
    '香菇', '木耳', '海带', '紫菜', '豆腐皮', '粉丝'
  ]
  const stepTemplates = [
    '准备食材并洗净',
    '食材切配处理',
    '预热锅具',
    '加入调料翻炒',
    '加水炖煮',
    '调味出锅',
    '装盘装饰'
  ]

  const recipes: Recipe[] = []
  for (let i = 0; i < recipeCount; i++) {
    const ingredientCount = Math.max(3, Math.floor(Math.random() * avgIngredientsPerRecipe * 2))
    const stepCount = Math.max(3, Math.floor(Math.random() * 6) + 2)

    const ingredients: Ingredient[] = []
    const usedIngredients = new Set<string>()
    for (let j = 0; j < ingredientCount; j++) {
      let name: string
      do {
        name = ingredientNames[Math.floor(Math.random() * ingredientNames.length)]
      } while (usedIngredients.has(name) && usedIngredients.size < ingredientNames.length)
      usedIngredients.add(name)
      
      ingredients.push({
        id: uuidv4(),
        name,
        quantity: Math.floor(Math.random() * 500) + 50,
        unit: ['g', 'ml', '个', '勺', '片'][Math.floor(Math.random() * 5)]
      })
    }

    const steps: Step[] = []
    for (let j = 0; j < stepCount; j++) {
      steps.push({
        id: uuidv4(),
        stepNumber: j + 1,
        description: `${stepTemplates[j % stepTemplates.length]} - 第${i + 1}道菜`,
        estimatedTime: Math.floor(Math.random() * 30) + 5,
        completed: false
      })
    }

    recipes.push({
      id: uuidv4(),
      name: `测试菜品${i + 1}`,
      cuisine: cuisines[i % cuisines.length],
      ingredients,
      steps
    })
  }

  return recipes
}

initSampleData()

app.get('/api/recipes', (_req, res) => {
  const recipes = Array.from(recipeMap.values()).map(recipeWithMapsToRecipe)
  res.json(recipes)
})

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipeMap.get(req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  res.json(recipeWithMapsToRecipe(recipe))
})

app.post('/api/recipes', (req, res) => {
  const startTime = process.hrtime.bigint()
  const { name, cuisine, ingredients, steps } = req.body

  const ingredientCount = ingredients.length
  const newIngredients: Ingredient[] = new Array(ingredientCount)
  for (let i = 0; i < ingredientCount; i++) {
    const ing = ingredients[i]
    newIngredients[i] = {
      id: ing.id || uuidv4(),
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    }
  }

  const stepCount = steps.length
  const newSteps: Step[] = new Array(stepCount)
  for (let i = 0; i < stepCount; i++) {
    const step = steps[i]
    newSteps[i] = {
      id: step.id || uuidv4(),
      stepNumber: step.stepNumber,
      description: step.description,
      estimatedTime: step.estimatedTime,
      completed: step.completed || false,
      actualTime: step.actualTime
    }
  }

  const newRecipe: Recipe = {
    id: uuidv4(),
    name,
    cuisine: cuisine as CuisineType,
    ingredients: newIngredients,
    steps: newSteps
  }

  const recipeWithMaps = addRecipeToMap(newRecipe)
  const endTime = process.hrtime.bigint()
  const durationMs = Number(endTime - startTime) / 1e6

  res.status(201).json({
    ...recipeWithMapsToRecipe(recipeWithMaps),
    _performance: { createTimeMs: durationMs }
  })
})

app.put('/api/recipes/:id', (req, res) => {
  const recipe = recipeMap.get(req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }

  const { name, cuisine, ingredients, steps, assignee } = req.body

  if (name !== undefined) recipe.name = name
  if (cuisine !== undefined) recipe.cuisine = cuisine
  if (assignee !== undefined) recipe.assignee = assignee

  if (ingredients) {
    recipe.ingredients = ingredients.map((ing: Ingredient) => ({
      ...ing,
      id: ing.id || uuidv4()
    }))
    invalidateShoppingCache()
  }

  if (steps) {
    recipe.steps = steps.map((step: Step) => ({
      ...step,
      id: step.id || uuidv4()
    }))
    recipe.stepMap.clear()
    for (const step of recipe.steps) {
      recipe.stepMap.set(step.id, step)
    }
  }

  res.json(recipeWithMapsToRecipe(recipe))
})

app.delete('/api/recipes/:id', (req, res) => {
  const deleted = recipeMap.delete(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  invalidateShoppingCache()
  res.status(204).send()
})

app.put('/api/recipes/:id/steps/:stepId', (req, res) => {
  const recipe = recipeMap.get(req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }

  const step = recipe.stepMap.get(req.params.stepId)
  if (!step) {
    return res.status(404).json({ error: 'Step not found' })
  }

  const { completed, actualTime } = req.body
  if (completed !== undefined) step.completed = completed
  if (actualTime !== undefined) step.actualTime = actualTime

  let allCompleted = true
  for (const s of recipe.steps) {
    if (!s.completed) {
      allCompleted = false
      break
    }
  }
  recipe.completed = allCompleted

  res.json({ step, allCompleted })
})

app.put('/api/recipes/:id/assignee', (req, res) => {
  const recipe = recipeMap.get(req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  recipe.assignee = req.body.assignee
  res.json(recipeWithMapsToRecipe(recipe))
})

app.get('/api/shopping-list', (_req, res) => {
  if (!shoppingListDirty && shoppingListCache) {
    return res.json(shoppingListCache)
  }

  const ingredientMap = new Map<string, { name: string; quantity: number; unit: string }>()

  for (const recipe of recipeMap.values()) {
    for (const ing of recipe.ingredients) {
      const key = `${ing.name}-${ing.unit}`
      const existing = ingredientMap.get(key)
      if (existing) {
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

  const shoppingList: ShoppingItem[] = new Array(ingredientMap.size)
  let i = 0
  for (const [key, item] of ingredientMap) {
    shoppingList[i++] = {
      id: key,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      purchased: purchasedItems.has(key)
    }
  }

  shoppingListCache = shoppingList
  shoppingListDirty = false

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

  invalidateShoppingCache()

  res.json({ id: itemId, purchased })
})

app.post('/api/test/benchmark-create', (req, res) => {
  const { recipeCount = 20, avgIngredients = 5 } = req.body

  const testRecipes = generateTestData(recipeCount, avgIngredients)

  const startTime = process.hrtime.bigint()
  for (const recipe of testRecipes) {
    addRecipeToMap(recipe)
  }
  const endTime = process.hrtime.bigint()
  const totalDurationMs = Number(endTime - startTime) / 1e6
  const avgDurationMs = totalDurationMs / recipeCount

  res.json({
    recipeCount,
    avgIngredientsPerRecipe: avgIngredients,
    totalDurationMs,
    avgDurationMs,
    meets200msRequirement: avgDurationMs < 200,
    totalRecipes: recipeMap.size
  })
})

app.post('/api/test/reset', (_req, res) => {
  recipeMap.clear()
  purchasedItems.clear()
  invalidateShoppingCache()
  initSampleData()
  res.json({ success: true, recipeCount: recipeMap.size })
})

app.get('/api/test/stats', (_req, res) => {
  let totalIngredients = 0
  let totalSteps = 0
  for (const recipe of recipeMap.values()) {
    totalIngredients += recipe.ingredients.length
    totalSteps += recipe.steps.length
  }
  res.json({
    recipeCount: recipeMap.size,
    totalIngredients,
    totalSteps,
    purchasedItemCount: purchasedItems.size
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`  - GET    /api/recipes`)
  console.log(`  - POST   /api/recipes`)
  console.log(`  - GET    /api/recipes/:id`)
  console.log(`  - PUT    /api/recipes/:id`)
  console.log(`  - DELETE /api/recipes/:id`)
  console.log(`  - PUT    /api/recipes/:id/steps/:stepId`)
  console.log(`  - PUT    /api/recipes/:id/assignee`)
  console.log(`  - GET    /api/shopping-list`)
  console.log(`  - PUT    /api/shopping-list/:id/purchase`)
  console.log(`  - POST   /api/test/benchmark-create (性能测试)`)
  console.log(`  - POST   /api/test/reset`)
  console.log(`  - GET    /api/test/stats`)
})
