import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import multer from 'multer'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Ingredient {
  name: string
  amount: string
}

interface Step {
  text: string
  image?: string
}

interface Recipe {
  id: string
  title: string
  coverImage: string
  description: string
  prepTime: number
  cookTime: number
  servings: number
  ingredients: Ingredient[]
  steps: Step[]
  author: string
  createdAt: string
  updatedAt: string
}

interface Comment {
  id: string
  recipeId: string
  username: string
  avatarColor: string
  rating: number
  content: string
  createdAt: string
}

const recipes: Recipe[] = [
  {
    id: '1',
    title: '经典番茄意面',
    coverImage: '/uploads/default-1.jpg',
    description: '简单却美味的经典意式番茄面，酸甜可口，是忙碌工作日的完美选择。',
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    ingredients: [
      { name: '意面', amount: '200g' },
      { name: '番茄', amount: '3个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '橄榄油', amount: '2汤匙' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
      { name: '罗勒叶', amount: '少许' },
    ],
    steps: [
      { text: '大锅烧水，加盐后放入意面，按包装指示煮至al dente。' },
      { text: '番茄切十字，用开水烫后去皮切丁。大蒜切薄片。' },
      { text: '平底锅中火加热橄榄油，放入蒜片煸至金黄出香。' },
      { text: '加入番茄丁翻炒5分钟，至番茄软烂出汁，加盐和黑胡椒调味。' },
      { text: '将煮好的意面沥水后加入酱汁中翻拌均匀，撒上新鲜罗勒叶即可上桌。' },
    ],
    author: '小厨娘',
    createdAt: '2025-01-15T08:00:00.000Z',
    updatedAt: '2025-01-15T08:00:00.000Z',
  },
  {
    id: '2',
    title: '日式味噌汤',
    coverImage: '/uploads/default-2.jpg',
    description: '暖胃的日式家常汤品，用白味噌调制，搭配豆腐和海带，鲜美清淡。',
    prepTime: 5,
    cookTime: 10,
    servings: 4,
    ingredients: [
      { name: '白味噌', amount: '3汤匙' },
      { name: '嫩豆腐', amount: '1块' },
      { name: '海带', amount: '10g' },
      { name: '葱花', amount: '适量' },
      { name: '水', amount: '600ml' },
      { name: '柴鱼片', amount: '一小把' },
    ],
    steps: [
      { text: '海带提前泡发30分钟，豆腐切1cm小丁。' },
      { text: '锅中加水放入海带，中火加热至微沸后取出海带，加入柴鱼片煮2分钟后过滤得到高汤。' },
      { text: '高汤重新入锅，放入豆腐丁，小火煮至微沸。' },
      { text: '取少量高汤化开味噌，再倒回锅中搅匀，切勿煮沸。' },
      { text: '盛碗撒上葱花，趁热享用。' },
    ],
    author: '和食达人',
    createdAt: '2025-02-20T10:30:00.000Z',
    updatedAt: '2025-02-20T10:30:00.000Z',
  },
  {
    id: '3',
    title: '香煎鸡胸肉配蔬菜沙拉',
    coverImage: '/uploads/default-3.jpg',
    description: '低脂高蛋白的健康餐，外酥内嫩的鸡胸肉搭配清爽蔬菜沙拉，健身人士首选。',
    prepTime: 15,
    cookTime: 12,
    servings: 2,
    ingredients: [
      { name: '鸡胸肉', amount: '2块' },
      { name: '混合生菜', amount: '150g' },
      { name: '小番茄', amount: '8颗' },
      { name: '橄榄油', amount: '2汤匙' },
      { name: '柠檬汁', amount: '1汤匙' },
      { name: '蒜粉', amount: '1茶匙' },
      { name: '盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
    ],
    steps: [
      { text: '鸡胸肉用刀背轻拍至厚度均匀，撒上盐、黑胡椒和蒜粉腌制10分钟。' },
      { text: '中大火加热平底锅，倒入1汤匙橄榄油，放入鸡胸肉煎4分钟不要翻动。' },
      { text: '翻面继续煎3-4分钟，至两面金黄内部熟透，取出静置5分钟后斜刀切片。' },
      { text: '混合生菜洗净沥干，小番茄对半切，用橄榄油和柠檬汁拌匀做沙拉。' },
      { text: '将鸡肉铺在沙拉上，根据喜好淋上酱汁即可。' },
    ],
    author: '健身大厨',
    createdAt: '2025-03-10T14:00:00.000Z',
    updatedAt: '2025-03-10T14:00:00.000Z',
  },
]

const comments: Comment[] = [
  {
    id: 'c1',
    recipeId: '1',
    username: '美食家小李',
    avatarColor: '#ed8936',
    rating: 5,
    content: '太好吃了！简单又美味 😋',
    createdAt: '2025-02-01T12:00:00.000Z',
  },
  {
    id: 'c2',
    recipeId: '1',
    username: '厨房新手',
    avatarColor: '#48bb78',
    rating: 4,
    content: '第一次做就很成功，推荐大家试试！',
    createdAt: '2025-02-05T18:30:00.000Z',
  },
  {
    id: 'c3',
    recipeId: '2',
    username: '日料爱好者',
    avatarColor: '#4299e1',
    rating: 5,
    content: '正宗的味道，比外面的还好喝！',
    createdAt: '2025-03-01T09:15:00.000Z',
  },
]

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  },
})

app.post('/api/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请选择图片' })
      return
    }

    const filename = `${uuidv4()}.jpg`
    const outputPath = path.join(__dirname, '..', 'uploads', filename)

    let pipeline = sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })

    const info = await pipeline.toFile(outputPath)

    if (info.size > 300 * 1024) {
      const quality = Math.floor((300 * 1024 / info.size) * 80)
      await sharp(req.file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: Math.max(quality, 30) })
        .toFile(outputPath)
    }

    res.json({ success: true, url: `/uploads/${filename}` })
  } catch {
    res.status(500).json({ success: false, error: '图片上传失败' })
  }
})

app.get('/api/recipes', (_req: Request, res: Response) => {
  const limit = parseInt(_req.query.limit as string) || 20
  const result = recipes.slice(0, limit).map(r => ({
    id: r.id,
    title: r.title,
    coverImage: r.coverImage,
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    author: r.author,
    createdAt: r.createdAt,
  }))
  res.json({ success: true, data: result })
})

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ success: false, error: '食谱未找到' })
    return
  }
  const recipeComments = comments.filter(c => c.recipeId === req.params.id)
  const avgRating = recipeComments.length > 0
    ? recipeComments.reduce((sum, c) => sum + c.rating, 0) / recipeComments.length
    : 0
  res.json({ success: true, data: { ...recipe, comments: recipeComments, avgRating } })
})

app.post('/api/recipes', (req: Request, res: Response) => {
  const { title, coverImage, description, prepTime, cookTime, servings, ingredients, steps, author } = req.body
  if (!title || !description) {
    res.status(400).json({ success: false, error: '标题和描述不能为空' })
    return
  }
  const now = new Date().toISOString()
  const recipe: Recipe = {
    id: uuidv4(),
    title,
    coverImage: coverImage || '',
    description,
    prepTime: prepTime || 0,
    cookTime: cookTime || 0,
    servings: servings || 1,
    ingredients: ingredients || [],
    steps: steps || [],
    author: author || '匿名',
    createdAt: now,
    updatedAt: now,
  }
  recipes.unshift(recipe)
  res.status(201).json({ success: true, data: recipe })
})

app.put('/api/recipes/:id', (req: Request, res: Response) => {
  const idx = recipes.findIndex(r => r.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: '食谱未找到' })
    return
  }
  const updated = { ...recipes[idx], ...req.body, updatedAt: new Date().toISOString() }
  recipes[idx] = updated
  res.json({ success: true, data: updated })
})

app.delete('/api/recipes/:id', (req: Request, res: Response) => {
  const idx = recipes.findIndex(r => r.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: '食谱未找到' })
    return
  }
  recipes.splice(idx, 1)
  res.json({ success: true })
})

app.get('/api/recipes/:id/comments', (req: Request, res: Response) => {
  const recipeComments = comments
    .filter(c => c.recipeId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ success: true, data: recipeComments })
})

app.post('/api/recipes/:id/comments', (req: Request, res: Response) => {
  const { username, rating, content } = req.body
  if (!content || !username) {
    res.status(400).json({ success: false, error: '用户名和评论内容不能为空' })
    return
  }
  const colors = ['#ed8936', '#48bb78', '#4299e1', '#9f7aea', '#f56565', '#38b2ac', '#d69e2e', '#e53e3e']
  const comment: Comment = {
    id: uuidv4(),
    recipeId: req.params.id,
    username,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    rating: rating || 5,
    content,
    createdAt: new Date().toISOString(),
  }
  comments.push(comment)
  res.status(201).json({ success: true, data: comment })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API未找到' })
})

export default app
