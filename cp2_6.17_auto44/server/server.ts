/**
 * server.ts - Express 后端服务器
 * 
 * 存储结构：使用内存数组模拟持久化（不使用数据库）
 * - shelves[]:    书架列表（虚拟房间）
 * - members[]:    成员列表（加入书架的用户）
 * - books[]:      书籍列表（某个成员在某个书架里添加的书）
 * - discussions[]:讨论记录列表
 * - shelfKeywordsMap: 书架ID → 该书架下所有书籍的关键词频率Map（动态聚合）
 *   键: shelfId, 值: Map<keyword, frequency>
 * 
 * REST API 端点清单 & 数据流向：
 *   [书架管理]
 *   GET    /api/shelves                → 返回所有书架 → 被 App.tsx (loadShelves) 调用
 *   GET    /api/shelves/:id            → 返回单个书架 → 被 App.tsx 调用
 *   POST   /api/shelves                → 创建新书架（生成6位邀请码）→ 被 App.tsx (handleCreateShelf) 调用
 *   POST   /api/shelves/join           → 通过邀请码加入书架 → 被 App.tsx (handleJoinShelf) 调用
 * 
 *   [书架成员]
 *   GET    /api/shelves/:id/members    → 返回某书架所有成员
 * 
 *   [书籍管理]
 *   GET    /api/shelves/:id/books      → 返回某书架所有书籍 → 被 BookShelf.tsx (loadBooks) 调用
 *   POST   /api/shelves/:id/books      → 给某书架添加一本新书（同时注入该书籍的关键词）
 *                                          → 被 BookShelf.tsx (handleAddBook) 调用
 *   POST   /api/books/:bookId/progress → 更新某本书的阅读进度 → 被 BookShelf.tsx (handleUpdateProgress) 调用
 * 
 *   [数据聚合]
 *   GET    /api/shelves/:id/average-progress → 返回某书架按日期聚合的小组平均阅读进度曲线
 *                                                → 被 BookShelf.tsx (loadAverageProgress) 调用
 *   GET    /api/shelves/:id/wordcloud        → 返回某书架动态聚合后的词云数据（关键词+频率）
 *                                                → 被 WordCloud.tsx (loadWordCloud) 调用
 *   GET    /api/discussions?word=xxx         → 返回指定关键词相关的讨论记录
 *                                                → 被 WordCloud.tsx (handleWordClick) 调用
 * 
 * 请求路径（前端→代理→后端）：
 *   前端 fetch('/api/xxx')  →  vite.config.js 代理到 http://localhost:3001/api/xxx
 *   → Express 路由匹配 → 处理内存数据 → 返回 JSON
 */

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

// ==================== 类型定义 ====================
interface Member {
  id: string
  nickname: string
  shelfId: string
}

interface ReadingProgress {
  id: string
  date: string
  currentPage: number
  memberId: string
  memberNickname: string
}

interface Book {
  id: string
  title: string
  author: string
  totalPages: number
  memberId: string
  memberNickname: string
  progress: ReadingProgress[]
  shelfId: string
}

interface Shelf {
  id: string
  name: string
  description: string
  inviteCode: string
  createdAt: string
}

interface DiscussionKeyword {
  word: string
  frequency: number
}

interface Discussion {
  id: string
  word: string
  content: string
  author: string
  date: string
}

// ==================== 内存数据存储 ====================
const shelves: Shelf[] = []
const members: Member[] = []
const books: Book[] = []
const discussions: Discussion[] = []

/**
 * 书架关键词频率 Map（动态聚合用）
 * 结构：Map<shelfId, Map<keyword, frequency>>
 * - 在 addBook() 时，根据书籍预设的关键词累积到对应书架的 frequency
 * - 在 GET /wordcloud 时，将 Map 转为数组并按频率降序返回
 */
type ShelfKeywordMap = Map<string, number>
const shelfKeywordsMap = new Map<string, ShelfKeywordMap>()

/**
 * 预设的「书籍标题 → 关键词列表」映射（模拟讨论热点）
 * 实际项目中可以是 NLP 提取，这里用字典模拟
 */
const BOOK_KEYWORD_DICTIONARY: Record<string, string[]> = {
  '百年孤独': ['人物塑造', '魔幻现实主义', '叙事手法', '主题思想', '家族命运', '孤独感', '哲学思考', '社会背景', '情感共鸣', '历史细节'],
  '三体': ['科幻硬核', '黑暗森林', '人物塑造', '主题思想', '哲学思考', '情节紧凑', '悬念设计', '叙事手法', '社会背景', '宇宙观'],
  '活着': ['情感共鸣', '人物塑造', '主题思想', '社会背景', '文笔优美', '生命意义', '哲学思考', '历史细节'],
  '平凡的世界': ['人物塑造', '情感共鸣', '社会背景', '主题思想', '历史细节', '叙事手法', '励志', '文笔优美'],
  '红楼梦': ['人物塑造', '家族兴衰', '文笔优美', '主题思想', '社会背景', '情感共鸣', '对话精彩', '结构精巧', '历史细节', '意境深远'],
  '1984': ['主题思想', '社会背景', '悬念设计', '哲学思考', '叙事手法', '人物塑造', '政治隐喻'],
  '人类简史': ['历史细节', '主题思想', '社会背景', '哲学思考', '叙事手法', '文笔优美'],
  '小王子': ['哲学思考', '情感共鸣', '主题思想', '文笔优美', '意境深远', '童话寓意'],
  '围城': ['语言幽默', '人物塑造', '对话精彩', '社会背景', '主题思想', '文笔优美', '讽刺'],
  '挪威的森林': ['情感共鸣', '心理描写', '人物塑造', '文笔优美', '主题思想', '青春回忆'],
}

/**
 * 通用讨论关键词池（用于书籍未命中字典时的 fallback）
 * 按文学分类随机抽取，保证每个书架至少有一些热词
 */
const GENERAL_KEYWORDS = [
  '人物塑造', '叙事手法', '主题思想', '文笔优美', '情节紧凑',
  '心理描写', '社会背景', '哲学思考', '情感共鸣', '悬念设计',
  '历史细节', '对话精彩', '意境深远', '结构精巧', '语言幽默'
]

/**
 * 模拟讨论内容池（用于 GET /discussions 查询时返回虚构讨论）
 */
const MOCK_DISCUSSIONS_POOL: { word: string; content: string; author: string; date: string }[] = [
  { word: '人物塑造', content: '这本书的主角形象太丰满了，从懦弱到勇敢的转变非常自然，作者用大量细节铺垫了人物弧光。', author: '小明', date: '2024-01-15' },
  { word: '人物塑造', content: '配角也很有戏，没有一个工具人，每个角色都有自己的动机和故事线。', author: '小红', date: '2024-01-16' },
  { word: '人物塑造', content: '反派塑造得尤其出色，不是纯粹的恶，而是有让人唏嘘的背景故事。', author: '阿华', date: '2024-01-17' },
  { word: '叙事手法', content: '多线叙事的运用很大胆，但读起来一点也不乱，章节切换的时机非常精准。', author: '阿华', date: '2024-01-14' },
  { word: '叙事手法', content: '倒叙和插叙的结合，让悬念层层递进，越读越想知道真相。', author: '小李', date: '2024-01-15' },
  { word: '主题思想', content: '关于自由与束缚的探讨太深刻了，值得反复品味，每个年龄段读都会有新的感悟。', author: '小李', date: '2024-01-17' },
  { word: '主题思想', content: '作者对人性的洞察非常犀利，字里行间都是对时代和社会的反思。', author: '小王', date: '2024-01-18' },
  { word: '主题思想', content: '虽然是虚构故事，但映射的现实问题让我感同身受，读完久久不能平静。', author: '小张', date: '2024-01-19' },
  { word: '情节紧凑', content: '一口气读完了，根本停不下来！每一章结尾都有钩子。', author: '小张', date: '2024-01-13' },
  { word: '情节紧凑', content: '没有多余的支线，主线推进干脆利落，这才是讲故事该有的节奏。', author: '小刘', date: '2024-01-14' },
  { word: '情感共鸣', content: '读到主角失去亲人那段，真的感同身受，眼眶湿了好几次。', author: '小刘', date: '2024-01-12' },
  { word: '情感共鸣', content: '那些关于成长的遗憾和不甘，写得太真实了，仿佛看到了过去的自己。', author: '小明', date: '2024-01-13' },
  { word: '文笔优美', content: '作者的文字功底太好了，随便翻一页都是可以抄下来的句子。', author: '小红', date: '2024-01-15' },
  { word: '心理描写', content: '第一人称的心理活动描写入木三分，读者仿佛进入了主角的内心世界。', author: '小王', date: '2024-01-16' },
  { word: '悬念设计', content: '伏笔埋得特别深，看到结局才恍然大悟，原来前面早就暗示了。', author: '阿华', date: '2024-01-17' },
  { word: '社会背景', content: '作者把那个年代的社会风貌写活了，读的时候像在看一部时代纪录片。', author: '小李', date: '2024-01-18' },
  { word: '哲学思考', content: '这本书提出的问题比给出的答案更多，读完后会忍不住一直思考。', author: '小张', date: '2024-01-19' },
  { word: '历史细节', content: '能看出来作者做了大量考据，器物、服饰、礼节都准确还原了时代。', author: '小刘', date: '2024-01-20' },
  { word: '对话精彩', content: '人物对话字字珠玑，潜台词丰富，一句顶十句的那种。', author: '小明', date: '2024-01-14' },
  { word: '结构精巧', content: '全书的结构像精密的钟表，每一个章节的位置都恰到好处。', author: '小红', date: '2024-01-15' },
  { word: '语言幽默', content: '作者太会写讽刺了，好多地方又好笑又扎心。', author: '小王', date: '2024-01-16' },
  { word: '意境深远', content: '结尾留白余韵悠长，合上书后脑子里还在回放那些画面。', author: '阿华', date: '2024-01-17' },
]

// ==================== 工具函数 ====================

/**
 * 生成 6 位邀请码（排除易混淆字符 I、O、1、0）
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 根据书架ID获取或初始化该书架的关键词频率Map
 */
function getOrInitShelfKeywords(shelfId: string): ShelfKeywordMap {
  let map = shelfKeywordsMap.get(shelfId)
  if (!map) {
    map = new Map<string, number>()
    shelfKeywordsMap.set(shelfId, map)
  }
  return map
}

/**
 * 为一本书注入关键词频率到书架的词云聚合表中
 * 逻辑：
 *   1. 根据书名命中 BOOK_KEYWORD_DICTIONARY → 获取特定关键词（每个频率 8~18）
 *   2. 未命中则从 GENERAL_KEYWORDS 中随机抽取 6~8 个（每个频率 3~10）
 */
function injectBookKeywordsToShelf(shelfId: string, bookTitle: string, bookAuthor: string) {
  const keywordMap = getOrInitShelfKeywords(shelfId)
  
  let keywords: string[] = []
  let baseFreqRange: [number, number] = [3, 10]
  
  // 1. 尝试按书名匹配预设关键词字典
  for (const dictTitle of Object.keys(BOOK_KEYWORD_DICTIONARY)) {
    if (bookTitle.includes(dictTitle) || dictTitle.includes(bookTitle)) {
      keywords = BOOK_KEYWORD_DICTIONARY[dictTitle]
      baseFreqRange = [8, 18]
      break
    }
  }
  
  // 2. 未命中则随机抽取通用关键词
  if (keywords.length === 0) {
    const shuffled = [...GENERAL_KEYWORDS].sort(() => Math.random() - 0.5)
    const count = 6 + Math.floor(Math.random() * 3) // 6~8个
    keywords = shuffled.slice(0, count)
  }
  
  // 3. 给每个关键词分配随机频率并累加到书架Map
  keywords.forEach((kw) => {
    const [minF, maxF] = baseFreqRange
    const freq = minF + Math.floor(Math.random() * (maxF - minF + 1))
    keywordMap.set(kw, (keywordMap.get(kw) || 0) + freq)
  })
  
  // 4. 根据作者名追加一个通用关键词（增加一点作者维度的多样性）
  const authorKw = ['文笔风格', '个人特色', '代表作', '文学地位']
  const pickAuthorKw = authorKw[Math.floor(Math.random() * authorKw.length)]
  keywordMap.set(pickAuthorKw, (keywordMap.get(pickAuthorKw) || 0) + (4 + Math.floor(Math.random() * 5)))
}

/**
 * 将关键词频率Map转为 { word, frequency } 数组并按频率降序排列
 */
function keywordMapToArray(map: ShelfKeywordMap): DiscussionKeyword[] {
  return Array.from(map.entries())
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
}

// ==================== REST API 端点 ====================

/**
 * GET /api/shelves - 获取所有书架列表
 * → 被 App.tsx 的 loadShelves() 调用 → 展示首页书架网格
 */
app.get('/api/shelves', (req, res) => {
  res.json(shelves)
})

/**
 * GET /api/shelves/:id - 获取单个书架详情
 * → 被 App.tsx 的 useEffect(currentShelfId) 调用 → 显示当前书架导航项
 */
app.get('/api/shelves/:id', (req, res) => {
  const shelf = shelves.find(s => s.id === req.params.id)
  if (!shelf) {
    return res.status(404).json({ error: '书架不存在' })
  }
  res.json(shelf)
})

/**
 * POST /api/shelves - 创建新书架
 * 入参: { name, description }
 * 返回: 新创建的 Shelf 对象（含生成的 6 位邀请码）
 * → 被 App.tsx 的 handleCreateShelf() 调用
 */
app.post('/api/shelves', (req, res) => {
  const { name, description } = req.body
  if (!name) {
    return res.status(400).json({ error: '书架名称不能为空' })
  }
  
  const newShelf: Shelf = {
    id: uuidv4(),
    name,
    description: description || '',
    inviteCode: generateInviteCode(),
    createdAt: new Date().toISOString(),
  }
  
  shelves.push(newShelf)
  // 为新书架初始化一个空的关键词Map
  getOrInitShelfKeywords(newShelf.id)
  res.status(201).json(newShelf)
})

/**
 * POST /api/shelves/join - 通过邀请码加入书架
 * 入参: { inviteCode, nickname }
 * 返回: { member, shelf }
 * → 被 App.tsx 的 handleJoinShelf() 调用
 */
app.post('/api/shelves/join', (req, res) => {
  const { inviteCode, nickname } = req.body
  if (!inviteCode || !nickname) {
    return res.status(400).json({ error: '邀请码和昵称不能为空' })
  }
  
  const shelf = shelves.find(s => s.inviteCode === inviteCode.toUpperCase())
  if (!shelf) {
    return res.status(404).json({ error: '邀请码无效' })
  }
  
  const existingMember = members.find(m => m.shelfId === shelf.id && m.nickname === nickname)
  if (existingMember) {
    return res.json({ member: existingMember, shelf })
  }
  
  const newMember: Member = {
    id: uuidv4(),
    nickname,
    shelfId: shelf.id,
  }
  
  members.push(newMember)
  res.json({ member: newMember, shelf })
})

/**
 * GET /api/shelves/:id/members - 获取某书架的所有成员
 */
app.get('/api/shelves/:id/members', (req, res) => {
  const shelfMembers = members.filter(m => m.shelfId === req.params.id)
  res.json(shelfMembers)
})

/**
 * GET /api/shelves/:id/books - 获取某书架下所有成员的所有书籍
 * → 被 BookShelf.tsx 的 loadBooks() 调用 → 渲染书籍卡片网格
 */
app.get('/api/shelves/:id/books', (req, res) => {
  const shelfBooks = books.filter(b => b.shelfId === req.params.id)
  res.json(shelfBooks)
})

/**
 * POST /api/shelves/:id/books - 给某书架添加一本新书
 * 入参: { title, author, totalPages, memberId }
 * 副作用: 调用 injectBookKeywordsToShelf() 把书籍关键词注入到书架的词云聚合Map
 * → 被 BookShelf.tsx 的 handleAddBook() 调用
 */
app.post('/api/shelves/:id/books', (req, res) => {
  const { title, author, totalPages, memberId } = req.body
  if (!title || !author || !totalPages || !memberId) {
    return res.status(400).json({ error: '书名、作者、总页数和成员ID不能为空' })
  }
  
  const member = members.find(m => m.id === memberId)
  if (!member) {
    return res.status(404).json({ error: '成员不存在' })
  }
  
  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    totalPages: Number(totalPages),
    memberId,
    memberNickname: member.nickname,
    progress: [],
    shelfId: req.params.id,
  }
  
  books.push(newBook)
  // 把这本书的关键词注入到所属书架的词云Map中（动态聚合词云数据）
  injectBookKeywordsToShelf(req.params.id, newBook.title, newBook.author)
  res.status(201).json(newBook)
})

/**
 * POST /api/books/:bookId/progress - 更新某本书的阅读进度
 * 入参: { currentPage, memberId }
 * → 被 BookShelf.tsx 的 handleUpdateProgress() 调用
 */
app.post('/api/books/:bookId/progress', (req, res) => {
  const { currentPage, memberId } = req.body
  if (currentPage === undefined || !memberId) {
    return res.status(400).json({ error: '当前页数和成员ID不能为空' })
  }
  
  const book = books.find(b => b.id === req.params.bookId)
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' })
  }
  
  const newProgress: ReadingProgress = {
    id: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    currentPage: Number(currentPage),
    memberId,
    memberNickname: book.memberNickname,
  }
  
  const todayIndex = book.progress.findIndex(
    p => p.date === newProgress.date && p.memberId === memberId
  )
  
  if (todayIndex >= 0) {
    book.progress[todayIndex] = newProgress
  } else {
    book.progress.push(newProgress)
  }
  
  book.progress.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  res.json(newProgress)
})

/**
 * GET /api/shelves/:id/average-progress - 获取小组平均进度曲线数据
 * 聚合逻辑: 遍历书架下所有书籍的所有 progress，按日期分组 → 求平均值
 * 返回: [{ date, percentage }] 按日期升序排列
 * → 被 BookShelf.tsx 的 loadAverageProgress() 调用 → canvas 绘制曲线图
 */
app.get('/api/shelves/:id/average-progress', (req, res) => {
  const shelfBooks = books.filter(b => b.shelfId === req.params.id)
  
  const progressByDate: Record<string, { total: number; count: number }> = {}
  
  shelfBooks.forEach(book => {
    const totalPages = book.totalPages || 100
    book.progress.forEach(p => {
      const percentage = Math.min(100, (p.currentPage / totalPages) * 100)
      if (!progressByDate[p.date]) {
        progressByDate[p.date] = { total: 0, count: 0 }
      }
      progressByDate[p.date].total += percentage
      progressByDate[p.date].count += 1
    })
  })
  
  const averageProgress = Object.entries(progressByDate)
    .map(([date, data]) => ({
      date,
      percentage: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  res.json(averageProgress)
})

/**
 * GET /api/shelves/:id/wordcloud - 获取某书架动态聚合后的词云数据
 * 逻辑: 从 shelfKeywordsMap[shelfId] 中取出关键词+频率，转数组并按频率降序返回
 *       如果该书架还没有关键词（空书架），则注入一些默认词返回
 * → 被 WordCloud.tsx 的 loadWordCloud() 调用 → 渲染词云布局
 */
app.get('/api/shelves/:id/wordcloud', (req, res) => {
  const shelfId = req.params.id
  const shelf = shelves.find(s => s.id === shelfId)
  if (!shelf) {
    return res.status(404).json({ error: '书架不存在' })
  }

  let keywordMap = shelfKeywordsMap.get(shelfId)
  
  // 如果书架没有任何关键词（比如还没添加过书籍），注入一组基于书架名称语义的默认词
  if (!keywordMap || keywordMap.size === 0) {
    keywordMap = getOrInitShelfKeywords(shelfId)
    // 根据书架名称关键词匹配不同类别的默认词
    const name = shelf.name.toLowerCase()
    let defaultKeywords: string[]
    if (name.includes('科幻') || name.includes('科技') || name.includes('宇宙')) {
      defaultKeywords = ['科幻硬核', '宇宙观', '悬念设计', '哲学思考', '情节紧凑', '人物塑造', '主题思想', '黑暗森林', '叙事手法', '未来想象']
    } else if (name.includes('文学') || name.includes('经典') || name.includes('名著')) {
      defaultKeywords = ['人物塑造', '主题思想', '情感共鸣', '文笔优美', '叙事手法', '社会背景', '历史细节', '哲学思考', '对话精彩', '结构精巧']
    } else if (name.includes('历史') || name.includes('传记')) {
      defaultKeywords = ['历史细节', '社会背景', '人物塑造', '主题思想', '叙事手法', '文笔风格', '哲学思考', '史料详实', '时代背景', '情感共鸣']
    } else {
      defaultKeywords = ['人物塑造', '主题思想', '叙事手法', '情感共鸣', '情节紧凑', '文笔优美', '哲学思考', '悬念设计', '心理描写', '社会背景']
    }
    // 注入默认词，频率 5~15
    defaultKeywords.forEach((kw, i) => {
      const freq = 5 + Math.floor(Math.random() * 11)
      keywordMap!.set(kw, freq)
    })
  }

  // 转成数组并按频率降序
  const result = keywordMapToArray(keywordMap)
  res.json(result)
})

/**
 * GET /api/books/:bookId/history - 获取某本书的完整阅读历史记录（含增量计算）
 * 返回结构: {
 *   book: { id, title, author, totalPages, memberNickname },
 *   history: [{ date, currentPage, deltaPages, percentage }]  按日期倒序排列
 * }
 * → 被 BookShelf.tsx 的 handleViewHistory() 调用 → 打开阅读历史模态框
 */
app.get('/api/books/:bookId/history', (req, res) => {
  const book = books.find(b => b.id === req.params.bookId)
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' })
  }

  // 按日期倒序排列，并计算相比上一条记录的页数增量
  const sortedProgress = [...book.progress].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const history = sortedProgress.map((record, idx) => {
    // 在原始升序数组中找位置来计算 delta
    const originalIdx = book.progress.findIndex(p => p.id === record.id)
    let deltaPages: number | null = null
    if (originalIdx > 0) {
      deltaPages = record.currentPage - book.progress[originalIdx - 1].currentPage
    }
    return {
      id: record.id,
      date: record.date,
      currentPage: record.currentPage,
      deltaPages,
      percentage: Math.min(100, (record.currentPage / (book.totalPages || 1)) * 100),
      memberNickname: record.memberNickname,
    }
  })

  res.json({
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      totalPages: book.totalPages,
      memberNickname: book.memberNickname,
    },
    history,
  })
})

/**
 * GET /api/discussions - 获取讨论记录
 * Query 参数: word (可选) - 指定关键词筛选
 * → 被 WordCloud.tsx 的 handleWordClick() 调用 → 打开讨论模态框
 */
app.get('/api/discussions', (req, res) => {
  const { word } = req.query
  if (word && typeof word === 'string') {
    const filtered = MOCK_DISCUSSIONS_POOL.filter(d => d.word === word)
    // 如果在池中没找到，生成一两条通用讨论
    if (filtered.length === 0) {
      const genericDiscussions = [
        { id: uuidv4(), word, content: `关于「${word}」，大家的讨论都很有深度，期待更多分享！`, author: '书友甲', date: '2024-01-18' },
        { id: uuidv4(), word, content: `我觉得这本书最打动人的就是${word}的处理方式，值得细品。`, author: '书友乙', date: '2024-01-19' },
      ]
      res.json(genericDiscussions)
    } else {
      res.json(filtered.map(d => ({ id: uuidv4(), ...d })))
    }
  } else {
    res.json(MOCK_DISCUSSIONS_POOL.map(d => ({ id: uuidv4(), ...d })))
  }
})

// ==================== 初始化 Mock 数据 ====================
/**
 * addMockData() - 服务器启动时注入示例数据，方便直接预览
 */
function addMockData() {
  // 书架1: 文学经典共读
  const mockShelf: Shelf = {
    id: 'mock-shelf-1',
    name: '文学经典共读',
    description: '一起品读中外文学经典，分享阅读感悟',
    inviteCode: 'ABC123',
    createdAt: '2024-01-01T00:00:00.000Z',
  }
  shelves.push(mockShelf)
  
  // 书架2: 科幻爱好者
  const mockShelf2: Shelf = {
    id: 'mock-shelf-2',
    name: '科幻爱好者',
    description: '探索未来世界，畅想科技发展',
    inviteCode: 'XYZ789',
    createdAt: '2024-01-05T00:00:00.000Z',
  }
  shelves.push(mockShelf2)
  
  // 成员数据
  const members_data = [
    { id: 'member-1', nickname: '小明', shelfId: 'mock-shelf-1' },
    { id: 'member-2', nickname: '小红', shelfId: 'mock-shelf-1' },
    { id: 'member-3', nickname: '阿华', shelfId: 'mock-shelf-1' },
  ]
  members.push(...members_data)
  
  // 书籍1: 小明读的《百年孤独》（会触发 BOOK_KEYWORD_DICTIONARY 匹配，注入文学类关键词）
  const book1: Book = {
    id: 'book-1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    totalPages: 360,
    memberId: 'member-1',
    memberNickname: '小明',
    shelfId: 'mock-shelf-1',
    progress: [
      { id: 'p1', date: '2024-01-10', currentPage: 50, memberId: 'member-1', memberNickname: '小明' },
      { id: 'p2', date: '2024-01-12', currentPage: 120, memberId: 'member-1', memberNickname: '小明' },
      { id: 'p3', date: '2024-01-15', currentPage: 200, memberId: 'member-1', memberNickname: '小明' },
      { id: 'p4', date: '2024-01-18', currentPage: 280, memberId: 'member-1', memberNickname: '小明' },
    ],
  }
  
  // 书籍2: 小红读的《百年孤独》
  const book2: Book = {
    id: 'book-2',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    totalPages: 360,
    memberId: 'member-2',
    memberNickname: '小红',
    shelfId: 'mock-shelf-1',
    progress: [
      { id: 'p5', date: '2024-01-10', currentPage: 30, memberId: 'member-2', memberNickname: '小红' },
      { id: 'p6', date: '2024-01-13', currentPage: 100, memberId: 'member-2', memberNickname: '小红' },
      { id: 'p7', date: '2024-01-16', currentPage: 180, memberId: 'member-2', memberNickname: '小红' },
      { id: 'p8', date: '2024-01-18', currentPage: 250, memberId: 'member-2', memberNickname: '小红' },
    ],
  }
  
  // 书籍3: 阿华读的《三体》（触发科幻类关键词，与百年孤独的关键词合并后聚合）
  const book3: Book = {
    id: 'book-3',
    title: '三体',
    author: '刘慈欣',
    totalPages: 302,
    memberId: 'member-3',
    memberNickname: '阿华',
    shelfId: 'mock-shelf-1',
    progress: [
      { id: 'p9', date: '2024-01-11', currentPage: 80, memberId: 'member-3', memberNickname: '阿华' },
      { id: 'p10', date: '2024-01-14', currentPage: 160, memberId: 'member-3', memberNickname: '阿华' },
      { id: 'p11', date: '2024-01-17', currentPage: 250, memberId: 'member-3', memberNickname: '阿华' },
    ],
  }
  
  books.push(book1, book2, book3)

  // 给书架1注入关键词（根据添加的3本书）
  injectBookKeywordsToShelf('mock-shelf-1', book1.title, book1.author)
  injectBookKeywordsToShelf('mock-shelf-1', book2.title, book2.author)
  injectBookKeywordsToShelf('mock-shelf-1', book3.title, book3.author)

  // 给书架2初始化一些科幻主题的关键词（没有书籍时的默认词）
  getOrInitShelfKeywords('mock-shelf-2')
}

addMockData()

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
  console.log(`📚 Book Club Server is running on http://localhost:${PORT}`)
})
