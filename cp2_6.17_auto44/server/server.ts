import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

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

const shelves: Shelf[] = []
const members: Member[] = []
const books: Book[] = []
const discussions: Discussion[] = []

const mockKeywords: DiscussionKeyword[] = [
  { word: '人物塑造', frequency: 15 },
  { word: '叙事手法', frequency: 12 },
  { word: '主题思想', frequency: 18 },
  { word: '文笔优美', frequency: 9 },
  { word: '情节紧凑', frequency: 14 },
  { word: '心理描写', frequency: 11 },
  { word: '社会背景', frequency: 7 },
  { word: '哲学思考', frequency: 10 },
  { word: '情感共鸣', frequency: 16 },
  { word: '悬念设计', frequency: 8 },
  { word: '历史细节', frequency: 6 },
  { word: '对话精彩', frequency: 13 },
  { word: '意境深远', frequency: 5 },
  { word: '结构精巧', frequency: 9 },
  { word: '语言幽默', frequency: 7 },
]

const mockDiscussions: Discussion[] = [
  { id: '1', word: '人物塑造', content: '这本书的主角形象太丰满了，从懦弱到勇敢的转变非常自然。', author: '小明', date: '2024-01-15' },
  { id: '2', word: '人物塑造', content: '配角也很有戏，每个角色都有自己的故事线。', author: '小红', date: '2024-01-16' },
  { id: '3', word: '叙事手法', content: '多线叙事的运用很大胆，但读起来一点也不乱。', author: '阿华', date: '2024-01-14' },
  { id: '4', word: '主题思想', content: '关于自由与束缚的探讨太深刻了，值得反复品味。', author: '小李', date: '2024-01-17' },
  { id: '5', word: '主题思想', content: '作者对人性的洞察非常犀利，让人深思。', author: '小王', date: '2024-01-18' },
  { id: '6', word: '情节紧凑', content: '一口气读完了，根本停不下来！', author: '小张', date: '2024-01-13' },
  { id: '7', word: '情感共鸣', content: '读到主角失去亲人那段，真的感同身受。', author: '小刘', date: '2024-01-12' },
]

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

app.get('/api/shelves', (req, res) => {
  res.json(shelves)
})

app.get('/api/shelves/:id', (req, res) => {
  const shelf = shelves.find(s => s.id === req.params.id)
  if (!shelf) {
    return res.status(404).json({ error: '书架不存在' })
  }
  res.json(shelf)
})

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
  res.status(201).json(newShelf)
})

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

app.get('/api/shelves/:id/members', (req, res) => {
  const shelfMembers = members.filter(m => m.shelfId === req.params.id)
  res.json(shelfMembers)
})

app.get('/api/shelves/:id/books', (req, res) => {
  const shelfBooks = books.filter(b => b.shelfId === req.params.id)
  res.json(shelfBooks)
})

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
  res.status(201).json(newBook)
})

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

app.get('/api/shelves/:id/wordcloud', (req, res) => {
  res.json(mockKeywords)
})

app.get('/api/discussions', (req, res) => {
  const { word } = req.query
  if (word) {
    const filtered = mockDiscussions.filter(d => d.word === word)
    res.json(filtered)
  } else {
    res.json(mockDiscussions)
  }
})

function addMockData() {
  const mockShelf: Shelf = {
    id: 'mock-shelf-1',
    name: '文学经典共读',
    description: '一起品读中外文学经典，分享阅读感悟',
    inviteCode: 'ABC123',
    createdAt: '2024-01-01T00:00:00.000Z',
  }
  shelves.push(mockShelf)
  
  const mockShelf2: Shelf = {
    id: 'mock-shelf-2',
    name: '科幻爱好者',
    description: '探索未来世界，畅想科技发展',
    inviteCode: 'XYZ789',
    createdAt: '2024-01-05T00:00:00.000Z',
  }
  shelves.push(mockShelf2)
  
  const members_data = [
    { id: 'member-1', nickname: '小明', shelfId: 'mock-shelf-1' },
    { id: 'member-2', nickname: '小红', shelfId: 'mock-shelf-1' },
    { id: 'member-3', nickname: '阿华', shelfId: 'mock-shelf-1' },
  ]
  members.push(...members_data)
  
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
}

addMockData()

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
