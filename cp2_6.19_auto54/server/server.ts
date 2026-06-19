import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

interface Ingredient {
  name: string
  amount: string
}

interface Recipe {
  id: number
  name: string
  description: string
  emoji: string
  ingredients: Ingredient[]
  steps: string[]
}

const recipes: Recipe[] = [
  {
    id: 1,
    name: '番茄炒蛋',
    description: '经典家常菜，酸甜可口，简单易做',
    emoji: '🍅',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1勺' },
      { name: '葱', amount: '少许' }
    ],
    steps: [
      '番茄切块，鸡蛋打散备用',
      '热锅冷油，倒入蛋液炒至凝固盛出',
      '锅中留底油，放入番茄块翻炒出汁',
      '加入炒好的鸡蛋，加盐和糖调味',
      '撒上葱花即可出锅'
    ]
  },
  {
    id: 2,
    name: '红烧肉',
    description: '肥而不腻，入口即化的经典硬菜',
    emoji: '🥩',
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '酱油', amount: '2勺' },
      { name: '冰糖', amount: '30g' },
      { name: '料酒', amount: '2勺' },
      { name: '姜', amount: '3片' },
      { name: '八角', amount: '2个' }
    ],
    steps: [
      '五花肉切块焯水去血沫',
      '锅中放油加冰糖小火炒糖色',
      '放入五花肉翻炒上色',
      '加酱油、料酒、姜、八角和适量水',
      '大火烧开转小火炖40分钟',
      '大火收汁即可'
    ]
  },
  {
    id: 3,
    name: '清炒时蔬',
    description: '清爽健康的素菜，保留食材原味',
    emoji: '🥬',
    ingredients: [
      { name: '青菜', amount: '300g' },
      { name: '蒜', amount: '3瓣' },
      { name: '盐', amount: '适量' },
      { name: '油', amount: '适量' }
    ],
    steps: [
      '青菜洗净沥干水分',
      '蒜切末备用',
      '热锅冷油爆香蒜末',
      '放入青菜大火快炒',
      '加盐调味出锅'
    ]
  },
  {
    id: 4,
    name: '麻婆豆腐',
    description: '麻辣鲜香，四川名菜，下饭神器',
    emoji: '🌶️',
    ingredients: [
      { name: '豆腐', amount: '1块' },
      { name: '牛肉末', amount: '100g' },
      { name: '豆瓣酱', amount: '1勺' },
      { name: '花椒粉', amount: '1小勺' },
      { name: '葱', amount: '少许' },
      { name: '蒜', amount: '3瓣' },
      { name: '姜', amount: '2片' }
    ],
    steps: [
      '豆腐切小块用盐水浸泡',
      '牛肉末加料酒腌制',
      '热锅炒香牛肉末盛出',
      '锅中加油爆香姜蒜末和豆瓣酱',
      '加水烧开放入豆腐和牛肉末',
      '勾芡撒花椒粉和葱花'
    ]
  },
  {
    id: 5,
    name: '宫保鸡丁',
    description: '酸甜微辣，鸡肉滑嫩，花生酥脆',
    emoji: '🍗',
    ingredients: [
      { name: '鸡胸肉', amount: '300g' },
      { name: '花生米', amount: '50g' },
      { name: '干辣椒', amount: '10个' },
      { name: '花椒', amount: '1小勺' },
      { name: '葱', amount: '2根' },
      { name: '蒜', amount: '3瓣' },
      { name: '料酒', amount: '1勺' },
      { name: '酱油', amount: '1勺' }
    ],
    steps: [
      '鸡胸肉切丁加料酒淀粉腌制',
      '调碗汁：酱油、醋、糖、淀粉、水',
      '花生米炸至金黄备用',
      '热锅爆香干辣椒和花椒',
      '放入鸡丁快炒至变色',
      '加葱姜蒜炒香倒入碗汁',
      '最后加入花生米翻匀'
    ]
  },
  {
    id: 6,
    name: '土豆烧牛肉',
    description: '牛肉软烂，土豆绵密，汤汁浓郁',
    emoji: '🥔',
    ingredients: [
      { name: '牛肉', amount: '400g' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '番茄', amount: '1个' },
      { name: '酱油', amount: '2勺' },
      { name: '姜', amount: '3片' }
    ],
    steps: [
      '牛肉切块焯水',
      '土豆胡萝卜切块',
      '番茄洋葱切碎',
      '锅中炒香番茄洋葱',
      '加牛肉、酱油、姜和水炖1小时',
      '放土豆胡萝卜再炖20分钟'
    ]
  },
  {
    id: 7,
    name: '蒜蓉西兰花',
    description: '营养丰富，翠绿爽口的健康菜',
    emoji: '🥦',
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '油', amount: '适量' }
    ],
    steps: [
      '西兰花切小朵洗净',
      '蒜切末备用',
      '西兰花焯水1分钟捞出',
      '热锅冷油爆香蒜末',
      '放入西兰花快炒加盐出锅'
    ]
  },
  {
    id: 8,
    name: '糖醋里脊',
    description: '外酥里嫩，酸甜可口的经典名菜',
    emoji: '🍖',
    ingredients: [
      { name: '猪里脊肉', amount: '300g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '淀粉', amount: '适量' },
      { name: '番茄酱', amount: '3勺' },
      { name: '糖', amount: '2勺' },
      { name: '醋', amount: '2勺' },
      { name: '料酒', amount: '1勺' }
    ],
    steps: [
      '里脊切条加料酒盐腌制',
      '加鸡蛋和淀粉抓匀',
      '调糖醋汁：番茄酱、糖、醋、水',
      '油温六成热炸里脊至金黄',
      '升高油温复炸至酥脆',
      '锅中留油炒糖醋汁',
      '倒入里脊翻匀出锅'
    ]
  },
  {
    id: 9,
    name: '凉拌黄瓜',
    description: '清凉爽口，夏日开胃小菜',
    emoji: '🥒',
    ingredients: [
      { name: '黄瓜', amount: '2根' },
      { name: '蒜', amount: '3瓣' },
      { name: '醋', amount: '2勺' },
      { name: '酱油', amount: '1勺' },
      { name: '香油', amount: '少许' },
      { name: '盐', amount: '适量' }
    ],
    steps: [
      '黄瓜拍碎切段',
      '蒜切末',
      '黄瓜加盐腌10分钟挤干水分',
      '加蒜末、醋、酱油、香油拌匀',
      '冷藏后口感更佳'
    ]
  },
  {
    id: 10,
    name: '西红柿鸡蛋面',
    description: '简单美味的家常汤面',
    emoji: '🍜',
    ingredients: [
      { name: '面条', amount: '200g' },
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '2个' },
      { name: '葱', amount: '少许' },
      { name: '盐', amount: '适量' },
      { name: '油', amount: '适量' }
    ],
    steps: [
      '番茄切块，鸡蛋打散',
      '热锅炒蛋盛出',
      '炒番茄出汁加水烧开',
      '下面条煮至软烂',
      '加鸡蛋和盐调味',
      '撒葱花出锅'
    ]
  },
  {
    id: 11,
    name: '青椒土豆丝',
    description: '酸辣爽脆的经典下饭菜',
    emoji: '🌶️',
    ingredients: [
      { name: '土豆', amount: '2个' },
      { name: '青椒', amount: '2个' },
      { name: '醋', amount: '2勺' },
      { name: '蒜', amount: '3瓣' },
      { name: '盐', amount: '适量' },
      { name: '干辣椒', amount: '3个' }
    ],
    steps: [
      '土豆青椒切丝泡水',
      '土豆丝焯水30秒捞出过凉',
      '热锅爆香干辣椒和蒜末',
      '放入土豆丝青椒丝大火快炒',
      '加醋和盐调味出锅'
    ]
  },
  {
    id: 12,
    name: '可乐鸡翅',
    description: '甜香入味，小孩最爱',
    emoji: '🍗',
    ingredients: [
      { name: '鸡翅', amount: '8个' },
      { name: '可乐', amount: '1罐' },
      { name: '酱油', amount: '2勺' },
      { name: '料酒', amount: '1勺' },
      { name: '姜', amount: '3片' },
      { name: '葱', amount: '1根' }
    ],
    steps: [
      '鸡翅两面划刀腌制10分钟',
      '鸡翅焯水去血沫',
      '锅中少油煎鸡翅至金黄',
      '加可乐、酱油、料酒、姜葱',
      '大火烧开转中小火炖15分钟',
      '大火收汁即可'
    ]
  }
]

app.get('/api/recipes', (_req, res) => {
  res.json(recipes)
})

app.get('/api/ingredients', (_req, res) => {
  const allIngredients = new Set<string>()
  recipes.forEach(r => r.ingredients.forEach(i => allIngredients.add(i.name)))
  res.json(Array.from(allIngredients))
})

app.post('/api/recommend', (req, res) => {
  const userIngredients: string[] = req.body.ingredients || []
  const userIngredientsLower = userIngredients.map(i => i.toLowerCase().trim())

  const result = recipes.map(recipe => {
    const totalIngredients = recipe.ingredients.length
    const matchedCount = recipe.ingredients.filter(ing =>
      userIngredientsLower.includes(ing.name.toLowerCase())
    ).length
    const matchPercentage = totalIngredients > 0
      ? Math.round((matchedCount / totalIngredients) * 100)
      : 0
    const matchedIngredients = recipe.ingredients
      .filter(ing => userIngredientsLower.includes(ing.name.toLowerCase()))
      .map(ing => ing.name)

    return {
      ...recipe,
      matchPercentage,
      matchedCount,
      totalIngredients,
      matchedIngredients
    }
  })
    .filter(r => r.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)

  res.json(result)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
