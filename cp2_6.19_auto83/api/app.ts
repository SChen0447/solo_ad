import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

type ActivityType = '运动' | '音乐' | '读书' | '桌游' | '户外' | '美食'

interface Registration {
  id: string
  userId: string
  userName: string
  avatarColor: string
  registeredAt: string
}

interface Comment {
  id: string
  activityId: string
  userId: string
  userName: string
  avatarColor: string
  content: string
  createdAt: string
}

interface Activity {
  id: string
  title: string
  description: string
  time: string
  location: string
  maxParticipants: number
  type: ActivityType
  coverColor: string
  createdAt: string
  registrations: Registration[]
  likes: string[]
  comments: Comment[]
  creatorId: string
}

interface User {
  id: string
  name: string
  avatarColor: string
}

const activities = new Map<string, Activity>()
const users = new Map<string, User>()

const coverColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
]

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#F39C12', '#E74C3C', '#3498DB', '#2ECC71',
]

function randomColor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(14, 0, 0, 0)
  return d.toISOString()
}

const sampleActivities: Activity[] = [
  {
    id: uuidv4(),
    title: '周末篮球约战',
    description: '每周六下午固定篮球局，欢迎各路球友来切磋！场地已预订，自带球鞋即可。新手老手都欢迎，主打一个快乐运动！',
    time: daysFromNow(3),
    location: '朝阳区望京体育公园篮球场',
    maxParticipants: 20,
    type: '运动',
    coverColor: '#FF6B6B',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    registrations: [
      { id: uuidv4(), userId: 'user-1', userName: '小明', avatarColor: '#4ECDC4', registeredAt: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), userId: 'user-2', userName: '阿华', avatarColor: '#45B7D1', registeredAt: new Date(Date.now() - 43200000).toISOString() },
      { id: uuidv4(), userId: 'user-3', userName: '大伟', avatarColor: '#96CEB4', registeredAt: new Date(Date.now() - 21600000).toISOString() },
    ],
    likes: ['user-2', 'user-3', 'user-4'],
    comments: [
      { id: uuidv4(), activityId: '', userId: 'user-2', userName: '阿华', avatarColor: '#45B7D1', content: '这次一定来！上次太爽了', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), activityId: '', userId: 'user-3', userName: '大伟', avatarColor: '#96CEB4', content: '可以带朋友来吗？', createdAt: new Date(Date.now() - 43200000).toISOString() },
    ],
    creatorId: 'user-1',
  },
  {
    id: uuidv4(),
    title: '吉他弹唱之夜',
    description: '带上你的吉他和好声音，一起在咖啡馆享受音乐的夜晚。不会弹也没关系，来听来唱都行！我们提供简单的饮品和小食。',
    time: daysFromNow(5),
    location: '海淀区五道口独立咖啡馆',
    maxParticipants: 15,
    type: '音乐',
    coverColor: '#4ECDC4',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    registrations: [
      { id: uuidv4(), userId: 'user-4', userName: '小雨', avatarColor: '#FFEAA7', registeredAt: new Date(Date.now() - 3600000).toISOString() },
      { id: uuidv4(), userId: 'user-5', userName: '阿杰', avatarColor: '#DDA0DD', registeredAt: new Date(Date.now() - 1800000).toISOString() },
    ],
    likes: ['user-1', 'user-4'],
    comments: [
      { id: uuidv4(), activityId: '', userId: 'user-4', userName: '小雨', avatarColor: '#FFEAA7', content: '期待！我带我的新吉他来', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    creatorId: 'user-4',
  },
  {
    id: uuidv4(),
    title: '读书会：本月共读《人类简史》',
    description: '本月我们共读尤瓦尔·赫拉利的《人类简史》，一起来讨论认知革命、农业革命和科学革命如何塑造了我们的世界。',
    time: daysFromNow(7),
    location: '西城区三里屯PageOne书店',
    maxParticipants: 10,
    type: '读书',
    coverColor: '#45B7D1',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    registrations: [
      { id: uuidv4(), userId: 'user-1', userName: '小明', avatarColor: '#4ECDC4', registeredAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    likes: ['user-2', 'user-5', 'user-6'],
    comments: [],
    creatorId: 'user-5',
  },
  {
    id: uuidv4(),
    title: '桌游争霸赛',
    description: '狼人杀、阿瓦隆、卡坦岛...各种桌游应有尽有！不管你是策略大师还是社交达人，都能找到属于你的乐趣。',
    time: daysFromNow(2),
    location: '东城区南锣鼓巷桌游吧',
    maxParticipants: 12,
    type: '桌游',
    coverColor: '#FFEAA7',
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    registrations: [
      { id: uuidv4(), userId: 'user-2', userName: '阿华', avatarColor: '#45B7D1', registeredAt: new Date(Date.now() - 72000000).toISOString() },
      { id: uuidv4(), userId: 'user-3', userName: '大伟', avatarColor: '#96CEB4', registeredAt: new Date(Date.now() - 50000000).toISOString() },
      { id: uuidv4(), userId: 'user-4', userName: '小雨', avatarColor: '#FFEAA7', registeredAt: new Date(Date.now() - 36000000).toISOString() },
      { id: uuidv4(), userId: 'user-5', userName: '阿杰', avatarColor: '#DDA0DD', registeredAt: new Date(Date.now() - 18000000).toISOString() },
      { id: uuidv4(), userId: 'user-6', userName: '小红', avatarColor: '#F39C12', registeredAt: new Date(Date.now() - 7200000).toISOString() },
      { id: uuidv4(), userId: 'user-7', userName: '老王', avatarColor: '#E74C3C', registeredAt: new Date(Date.now() - 3600000).toISOString() },
      { id: uuidv4(), userId: 'user-8', userName: '小李', avatarColor: '#3498DB', registeredAt: new Date(Date.now() - 1800000).toISOString() },
      { id: uuidv4(), userId: 'user-9', userName: '小张', avatarColor: '#2ECC71', registeredAt: new Date(Date.now() - 900000).toISOString() },
      { id: uuidv4(), userId: 'user-10', userName: '小陈', avatarColor: '#BB8FCE', registeredAt: new Date(Date.now() - 500000).toISOString() },
      { id: uuidv4(), userId: 'user-11', userName: '小赵', avatarColor: '#85C1E9', registeredAt: new Date(Date.now() - 200000).toISOString() },
      { id: uuidv4(), userId: 'user-12', userName: '小孙', avatarColor: '#F7DC6F', registeredAt: new Date().toISOString() },
    ],
    likes: ['user-1', 'user-3', 'user-6', 'user-7'],
    comments: [
      { id: uuidv4(), activityId: '', userId: 'user-2', userName: '阿华', avatarColor: '#45B7D1', content: '这次一定要赢回来！', createdAt: new Date(Date.now() - 72000000).toISOString() },
      { id: uuidv4(), activityId: '', userId: 'user-6', userName: '小红', avatarColor: '#F39C12', content: '新手能来吗？', createdAt: new Date(Date.now() - 36000000).toISOString() },
    ],
    creatorId: 'user-2',
  },
  {
    id: uuidv4(),
    title: '香山秋日徒步',
    description: '趁秋色正好，一起去香山徒步吧！路线从香山公园北门出发，经香炉峰到碧云寺，全程约3小时，适合有基本体力的人参加。',
    time: daysFromNow(10),
    location: '海淀区香山公园北门',
    maxParticipants: 25,
    type: '户外',
    coverColor: '#96CEB4',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    registrations: [
      { id: uuidv4(), userId: 'user-1', userName: '小明', avatarColor: '#4ECDC4', registeredAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: uuidv4(), userId: 'user-3', userName: '大伟', avatarColor: '#96CEB4', registeredAt: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), userId: 'user-6', userName: '小红', avatarColor: '#F39C12', registeredAt: new Date(Date.now() - 43200000).toISOString() },
      { id: uuidv4(), userId: 'user-8', userName: '小李', avatarColor: '#3498DB', registeredAt: new Date(Date.now() - 21600000).toISOString() },
      { id: uuidv4(), userId: 'user-9', userName: '小张', avatarColor: '#2ECC71', registeredAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    likes: ['user-1', 'user-2', 'user-3', 'user-5', 'user-6'],
    comments: [
      { id: uuidv4(), activityId: '', userId: 'user-1', userName: '小明', avatarColor: '#4ECDC4', content: '记得穿舒适的运动鞋！', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), activityId: '', userId: 'user-6', userName: '小红', avatarColor: '#F39C12', content: '好期待，第一次徒步', createdAt: new Date(Date.now() - 43200000).toISOString() },
      { id: uuidv4(), activityId: '', userId: 'user-3', userName: '大伟', avatarColor: '#96CEB4', content: '带好水和干粮', createdAt: new Date(Date.now() - 21600000).toISOString() },
    ],
    creatorId: 'user-3',
  },
]

sampleActivities.forEach(a => {
  a.comments.forEach(c => { c.activityId = a.id })
  activities.set(a.id, a)
})

const defaultUser: User = {
  id: 'current-user',
  name: '我',
  avatarColor: '#FF6B6B',
}
users.set(defaultUser.id, defaultUser)

app.get('/api/activities', (_req: Request, res: Response) => {
  const list = Array.from(activities.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  res.json(list)
})

app.get('/api/activities/:id', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    res.status(404).json({ success: false, message: '活动不存在' })
    return
  }
  res.json(activity)
})

app.post('/api/activities', (req: Request, res: Response) => {
  const { title, description, time, location, maxParticipants, type, creatorId } = req.body
  if (!title || !time || !location) {
    res.status(400).json({ success: false, message: '缺少必填字段' })
    return
  }
  const newActivity: Activity = {
    id: uuidv4(),
    title,
    description: description || '',
    time,
    location,
    maxParticipants: maxParticipants || 10,
    type: type || '户外',
    coverColor: randomColor(coverColors),
    createdAt: new Date().toISOString(),
    registrations: [],
    likes: [],
    comments: [],
    creatorId: creatorId || 'current-user',
  }
  activities.set(newActivity.id, newActivity)
  res.json(newActivity)
})

app.post('/api/activities/:id/register', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    res.status(404).json({ success: false, message: '活动不存在' })
    return
  }
  const { userId, userName } = req.body
  if (activity.registrations.length >= activity.maxParticipants) {
    res.status(400).json({ success: false, message: '活动人数已满' })
    return
  }
  const alreadyRegistered = activity.registrations.some(r => r.userId === userId)
  if (alreadyRegistered) {
    res.json(activity)
    return
  }
  activity.registrations.push({
    id: uuidv4(),
    userId,
    userName: userName || '匿名用户',
    avatarColor: randomColor(avatarColors),
    registeredAt: new Date().toISOString(),
  })
  res.json(activity)
})

app.delete('/api/activities/:id/register', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    res.status(404).json({ success: false, message: '活动不存在' })
    return
  }
  const { userId } = req.body
  activity.registrations = activity.registrations.filter(r => r.userId !== userId)
  res.json(activity)
})

app.post('/api/activities/:id/like', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    res.status(404).json({ success: false, message: '活动不存在' })
    return
  }
  const { userId } = req.body
  const idx = activity.likes.indexOf(userId)
  if (idx >= 0) {
    activity.likes.splice(idx, 1)
  } else {
    activity.likes.push(userId)
  }
  res.json(activity)
})

app.post('/api/activities/:id/comments', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    res.status(404).json({ success: false, message: '活动不存在' })
    return
  }
  const { userId, userName, content } = req.body
  if (!content || !content.trim()) {
    res.status(400).json({ success: false, message: '评论内容不能为空' })
    return
  }
  const newComment: Comment = {
    id: uuidv4(),
    activityId: activity.id,
    userId: userId || 'current-user',
    userName: userName || '匿名用户',
    avatarColor: randomColor(avatarColors),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  activity.comments.unshift(newComment)
  res.json(activity.comments)
})

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.get(req.params.id)
  if (!user) {
    res.status(404).json({ success: false, message: '用户不存在' })
    return
  }
  const createdActivities = Array.from(activities.values()).filter(
    a => a.creatorId === user.id
  )
  const registeredActivities = Array.from(activities.values()).filter(
    a => a.registrations.some(r => r.userId === user.id)
  )
  res.json({ ...user, createdActivities, registeredActivities })
})

app.post('/api/users', (req: Request, res: Response) => {
  const { name } = req.body
  const user: User = {
    id: 'current-user',
    name: name || '我',
    avatarColor: randomColor(avatarColors),
  }
  users.set(user.id, user)
  res.json(user)
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
