import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

type Condition = '全新' | '几乎全新' | '轻微使用痕迹' | '明显使用痕迹'

interface ExchangeRequest {
  id: string
  requesterId: string
  requesterName: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

interface Item {
  id: string
  title: string
  description: string
  imageUrl: string
  condition: Condition
  ownerId: string
  ownerName: string
  exchangeRequests: ExchangeRequest[]
  createdAt: string
}

interface Reply {
  id: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
}

interface Answer {
  id: string
  content: string
  authorId: string
  authorName: string
  likes: number
  likedBy: Set<string>
  replies: Reply[]
  createdAt: string
}

interface Question {
  id: string
  title: string
  content: string
  tags: string[]
  authorId: string
  authorName: string
  answers: Answer[]
  createdAt: string
}

const itemsMap = new Map<string, Item>()
const questionsMap = new Map<string, Question>()
const userItemsMap = new Map<string, Set<string>>()
const tagQuestionsMap = new Map<string, Set<string>>()

const genId = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36)

const seedUsers = [
  { id: 'u1', name: '邻居小明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming' },
  { id: 'u2', name: '邻居小红', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohong' },
  { id: 'u3', name: '邻居老王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang' }
]

const seedItems: Omit<Item, 'id' | 'exchangeRequests' | 'createdAt'>[] = [
  { title: '九成新小米空气净化器', description: '搬家出，用了不到一年，滤芯刚换过，适合20平左右房间', imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500', condition: '几乎全新', ownerId: 'u1', ownerName: '邻居小明' },
  { title: '儿童绘本一整套', description: '孩子大了用不上，30多本绘本，保存良好', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', condition: '轻微使用痕迹', ownerId: 'u2', ownerName: '邻居小红' },
  { title: '宜家双人沙发', description: '使用两年，布面可拆洗，颜色为浅灰色', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500', condition: '轻微使用痕迹', ownerId: 'u3', ownerName: '邻居老王' },
  { title: '全新未拆封蓝牙音箱', description: '朋友送的礼物，自己已有一个，全新转', imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', condition: '全新', ownerId: 'u1', ownerName: '邻居小明' },
  { title: '九阳豆浆机', description: '用了半年多，功能完好，配件齐全', imageUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500', condition: '几乎全新', ownerId: 'u2', ownerName: '邻居小红' },
  { title: '自行车一辆', description: '代步自行车，变速功能正常，适合日常通勤', imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500', condition: '明显使用痕迹', ownerId: 'u3', ownerName: '邻居老王' },
  { title: '收纳箱五个', description: '整理衣柜出，大号收纳箱，带轮子', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500', condition: '轻微使用痕迹', ownerId: 'u1', ownerName: '邻居小明' },
  { title: '羽毛球拍一副', description: 'YONEX入门款，带拍套，几乎没用过', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500', condition: '几乎全新', ownerId: 'u2', ownerName: '邻居小红' },
  { title: '厨房锅具套装', description: '汤锅+煎锅+奶锅三件套，不锈钢材质', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500', condition: '轻微使用痕迹', ownerId: 'u3', ownerName: '邻居老王' },
  { title: '全新瑜伽垫', description: 'TPE材质，8mm厚，紫色，买重复了', imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', condition: '全新', ownerId: 'u1', ownerName: '邻居小明' },
  { title: '电热水壶', description: '1.5L容量，304不锈钢，自动断电', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500', condition: '几乎全新', ownerId: 'u2', ownerName: '邻居小红' },
  { title: '多肉植物十盆', description: '养太多了，打包出，含陶瓷盆', imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=500', condition: '轻微使用痕迹', ownerId: 'u3', ownerName: '邻居老王' },
  { title: '电子书阅读器', description: 'Kindle Paperwhite，背光正常，送保护套', imageUrl: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=500', condition: '轻微使用痕迹', ownerId: 'u1', ownerName: '邻居小明' },
  { title: '滑板', description: '双翘滑板，入门级，适合新手练习', imageUrl: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=500', condition: '明显使用痕迹', ownerId: 'u2', ownerName: '邻居小红' },
  { title: '台灯', description: 'LED护眼台灯，三档调光，USB充电', imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500', condition: '几乎全新', ownerId: 'u3', ownerName: '邻居老王' }
]

seedItems.forEach((item, idx) => {
  const id = 'item_' + (idx + 1)
  const fullItem: Item = {
    ...item,
    id,
    exchangeRequests: [],
    createdAt: new Date(Date.now() - idx * 3600000).toISOString()
  }
  itemsMap.set(id, fullItem)
  if (!userItemsMap.has(item.ownerId)) userItemsMap.set(item.ownerId, new Set())
  userItemsMap.get(item.ownerId)!.add(id)
})

const seedQuestions: (Omit<Question, 'id' | 'answers' | 'createdAt'> & { answers: (Omit<Answer, 'id' | 'likedBy' | 'replies' | 'createdAt'> & { replies: Omit<Reply, 'id' | 'createdAt'>[] })[] })[] = [
  {
    title: '小区最近的快递柜在哪里？',
    content: '刚搬来3号楼，找了一圈没看到快递柜，有邻居知道吗？',
    tags: ['生活求助', '快递'],
    authorId: 'u1', authorName: '邻居小明',
    answers: [
      { content: '2号楼和4号楼之间有丰巢，另外东门传达室也可以代收', authorId: 'u2', authorName: '邻居小红', likes: 5, replies: [
        { content: '好的谢谢！东门是哪个门？', authorId: 'u1', authorName: '邻居小明' },
        { content: '就是靠近超市那个门哈', authorId: 'u2', authorName: '邻居小红' }
      ]}
    ]
  },
  {
    title: '有人知道附近哪里有修自行车的吗？',
    content: '自行车胎爆了，找了半天没看到修车摊',
    tags: ['生活求助', '维修'],
    authorId: 'u3', authorName: '邻居老王',
    answers: [
      { content: '小区西门出去走50米，有个张师傅修车摊，开了好多年了', authorId: 'u1', authorName: '邻居小明', likes: 3, replies: [] }
    ]
  },
  {
    title: '周末有人一起打羽毛球吗？',
    content: '想找几个邻居周末一起去附近体育馆打球，AA制',
    tags: ['活动约伴', '运动'],
    authorId: 'u2', authorName: '邻居小红',
    answers: [
      { content: '我可以！周六上午有空', authorId: 'u1', authorName: '邻居小明', likes: 2, replies: [
        { content: '好呀，那我们约周六10点，我来订场地', authorId: 'u2', authorName: '邻居小红' }
      ]},
      { content: '我也想加入，好久没打了', authorId: 'u3', authorName: '邻居老王', likes: 1, replies: [] }
    ]
  },
  {
    title: '孩子明年上小学，需要提前准备什么材料？',
    content: '第一次当家长没啥经验，请教下有经验的邻居',
    tags: ['育儿', '教育咨询'],
    authorId: 'u1', authorName: '邻居小明',
    answers: [
      { content: '户口本、房产证、疫苗接种证明这三个是必须的，建议提前去社区居委会问下具体要求', authorId: 'u3', authorName: '邻居老王', likes: 8, replies: [] }
    ]
  },
  {
    title: '请问小区停水通知一般在哪里看？',
    content: '好几次突然停水都没提前知道',
    tags: ['物业信息', '生活求助'],
    authorId: 'u2', authorName: '邻居小红',
    answers: [
      { content: '物业有个微信群，会提前发通知；另外每栋楼公告栏也会贴', authorId: 'u3', authorName: '邻居老王', likes: 4, replies: [
        { content: '求拉进群！', authorId: 'u2', authorName: '邻居小红' }
      ]}
    ]
  },
  {
    title: '有人家里闲置猫包可以交换吗？',
    content: '最近刚领养了只小猫，需要一个猫包带它去体检',
    tags: ['物品求换', '宠物'],
    authorId: 'u1', authorName: '邻居小明',
    answers: []
  }
]

seedQuestions.forEach((q, idx) => {
  const id = 'q_' + (idx + 1)
  const answers: Answer[] = q.answers.map((a, aidx) => ({
    ...a,
    id: 'a_' + (idx + 1) + '_' + (aidx + 1),
    likedBy: new Set(),
    replies: a.replies.map((r, ridx) => ({
      ...r,
      id: 'r_' + (idx + 1) + '_' + (aidx + 1) + '_' + (ridx + 1),
      createdAt: new Date(Date.now() - (idx * 100 + aidx * 50 + ridx * 10) * 60000).toISOString()
    })),
    createdAt: new Date(Date.now() - (idx * 100 + aidx * 50) * 60000).toISOString()
  }))
  const fullQ: Question = {
    ...q,
    id,
    answers,
    createdAt: new Date(Date.now() - idx * 7200000).toISOString()
  }
  questionsMap.set(id, fullQ)
  q.tags.forEach(tag => {
    if (!tagQuestionsMap.has(tag)) tagQuestionsMap.set(tag, new Set())
    tagQuestionsMap.get(tag)!.add(id)
  })
})

function serializeItem(item: Item) {
  return { ...item }
}

function serializeQuestion(q: Question) {
  return {
    ...q,
    answers: q.answers.map(a => ({
      ...a,
      likedBy: Array.from(a.likedBy),
      likes: a.likes
    }))
  }
}

app.get('/api/items', (req: Request, res: Response) => {
  const { userId, page = '1', pageSize = '12' } = req.query
  let items = Array.from(itemsMap.values())
  if (userId) {
    const userItemIds = userItemsMap.get(userId as string)
    if (userItemIds) {
      items = items.filter(i => userItemIds.has(i.id))
    } else {
      items = []
    }
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const p = parseInt(page as string)
  const ps = parseInt(pageSize as string)
  const start = (p - 1) * ps
  const end = start + ps
  const paginated = items.slice(start, end)
  res.json({
    items: paginated.map(serializeItem),
    total: items.length,
    hasMore: end < items.length
  })
})

app.get('/api/items/:id', (req: Request, res: Response) => {
  const item = itemsMap.get(req.params.id)
  if (!item) return res.status(404).json({ error: '物品不存在' })
  res.json(serializeItem(item))
})

app.post('/api/items', (req: Request, res: Response) => {
  const { title, description, imageUrl, condition, ownerId, ownerName } = req.body
  if (!title || !ownerId) return res.status(400).json({ error: '缺少必要参数' })
  const id = 'item_' + genId()
  const item: Item = {
    id, title, description: description || '', imageUrl: imageUrl || '',
    condition: condition || '轻微使用痕迹',
    ownerId, ownerName: ownerName || '匿名邻居',
    exchangeRequests: [],
    createdAt: new Date().toISOString()
  }
  itemsMap.set(id, item)
  if (!userItemsMap.has(ownerId)) userItemsMap.set(ownerId, new Set())
  userItemsMap.get(ownerId)!.add(id)
  res.status(201).json(serializeItem(item))
})

app.delete('/api/items/:id', (req: Request, res: Response) => {
  const item = itemsMap.get(req.params.id)
  if (!item) return res.status(404).json({ error: '物品不存在' })
  itemsMap.delete(req.params.id)
  const userSet = userItemsMap.get(item.ownerId)
  if (userSet) userSet.delete(req.params.id)
  res.json({ success: true })
})

app.post('/api/items/:id/exchange', (req: Request, res: Response) => {
  const item = itemsMap.get(req.params.id)
  if (!item) return res.status(404).json({ error: '物品不存在' })
  const { requesterId, requesterName, message } = req.body
  if (!requesterId) return res.status(400).json({ error: '缺少申请人信息' })
  const exchangeReq: ExchangeRequest = {
    id: 'ex_' + genId(),
    requesterId,
    requesterName: requesterName || '匿名邻居',
    message: message || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  item.exchangeRequests.push(exchangeReq)
  res.status(201).json(exchangeReq)
})

app.get('/api/questions', (req: Request, res: Response) => {
  const { tag, userId } = req.query
  let questions = Array.from(questionsMap.values())
  if (tag) {
    const qIds = tagQuestionsMap.get(tag as string)
    if (qIds) questions = questions.filter(q => qIds.has(q.id))
    else questions = []
  }
  if (userId) {
    questions = questions.filter(q => q.authorId === userId)
  }
  questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json(questions.map(serializeQuestion))
})

app.get('/api/questions/:id', (req: Request, res: Response) => {
  const q = questionsMap.get(req.params.id)
  if (!q) return res.status(404).json({ error: '问题不存在' })
  res.json(serializeQuestion(q))
})

app.post('/api/questions', (req: Request, res: Response) => {
  const { title, content, tags, authorId, authorName } = req.body
  if (!title || !authorId) return res.status(400).json({ error: '缺少必要参数' })
  const id = 'q_' + genId()
  const question: Question = {
    id, title, content: content || '', tags: tags || [],
    authorId, authorName: authorName || '匿名邻居',
    answers: [],
    createdAt: new Date().toISOString()
  }
  questionsMap.set(id, question)
  ;(tags || []).forEach((tag: string) => {
    if (!tagQuestionsMap.has(tag)) tagQuestionsMap.set(tag, new Set())
    tagQuestionsMap.get(tag)!.add(id)
  })
  res.status(201).json(serializeQuestion(question))
})

app.delete('/api/questions/:id', (req: Request, res: Response) => {
  const q = questionsMap.get(req.params.id)
  if (!q) return res.status(404).json({ error: '问题不存在' })
  questionsMap.delete(req.params.id)
  q.tags.forEach(tag => {
    const set = tagQuestionsMap.get(tag)
    if (set) {
      set.delete(req.params.id)
      if (set.size === 0) tagQuestionsMap.delete(tag)
    }
  })
  res.json({ success: true })
})

app.post('/api/questions/:id/answers', (req: Request, res: Response) => {
  const q = questionsMap.get(req.params.id)
  if (!q) return res.status(404).json({ error: '问题不存在' })
  const { content, authorId, authorName } = req.body
  if (!content || !authorId) return res.status(400).json({ error: '缺少必要参数' })
  const answer: Answer = {
    id: 'a_' + genId(),
    content, authorId, authorName: authorName || '匿名邻居',
    likes: 0, likedBy: new Set(), replies: [],
    createdAt: new Date().toISOString()
  }
  q.answers.push(answer)
  res.status(201).json({ ...answer, likedBy: Array.from(answer.likedBy) })
})

app.post('/api/answers/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: '缺少userId' })
  for (const q of questionsMap.values()) {
    const answer = q.answers.find(a => a.id === req.params.id)
    if (answer) {
      if (answer.likedBy.has(userId)) {
        answer.likedBy.delete(userId)
        answer.likes = Math.max(0, answer.likes - 1)
      } else {
        answer.likedBy.add(userId)
        answer.likes += 1
      }
      return res.json({ likes: answer.likes, liked: answer.likedBy.has(userId) })
    }
  }
  res.status(404).json({ error: '回答不存在' })
})

app.post('/api/answers/:id/reply', (req: Request, res: Response) => {
  const { content, authorId, authorName } = req.body
  if (!content || !authorId) return res.status(400).json({ error: '缺少必要参数' })
  for (const q of questionsMap.values()) {
    const answer = q.answers.find(a => a.id === req.params.id)
    if (answer) {
      const reply: Reply = {
        id: 'r_' + genId(),
        content, authorId, authorName: authorName || '匿名邻居',
        createdAt: new Date().toISOString()
      }
      answer.replies.push(reply)
      return res.status(201).json(reply)
    }
  }
  res.status(404).json({ error: '回答不存在' })
})

app.get('/api/users/:userId', (req: Request, res: Response) => {
  const user = seedUsers.find(u => u.id === req.params.userId) || {
    id: req.params.userId,
    name: '邻居朋友',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.params.userId}`
  }
  res.json(user)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`闲邻后端服务已启动: http://localhost:${PORT}`)
})
