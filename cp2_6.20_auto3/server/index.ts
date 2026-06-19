import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface User {
  id: string
  name: string
  avatar: string
}

interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  createdAt: number
}

interface Activity {
  id: string
  title: string
  description: string
  time: number
  location: string
  maxParticipants: number
  participants: User[]
  type: string
  tags?: string[]
  likes: number
  likedBy: string[]
  favorites: string[]
  comments: Comment[]
  createdAt: number
  coverColor: string
}

const activities = new Map<string, Activity>()
const users = new Map<string, User>()

const coverColors = [
  'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)',
  'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
]

const sampleUsers: User[] = [
  { id: 'user1', name: '小明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1' },
  { id: 'user2', name: '小红', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2' },
  { id: 'user3', name: '小华', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3' },
  { id: 'user4', name: '小李', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4' },
  { id: 'user5', name: '小王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5' }
]

sampleUsers.forEach(user => users.set(user.id, user))

const now = Date.now()
const dayMs = 24 * 60 * 60 * 1000

const sampleActivities: Activity[] = [
  {
    id: uuidv4(),
    title: '周末篮球友谊赛',
    description: '周末一起打篮球吧！锻炼身体，结交朋友，欢迎各个水平的球友参加。我们会分组队，保证每个人都有充足的上场时间。',
    time: now + 2 * dayMs,
    location: '朝阳公园篮球场',
    maxParticipants: 12,
    participants: [sampleUsers[0], sampleUsers[1]],
    type: '运动',
    tags: ['运动', '篮球', '友谊赛', '户外'],
    likes: 15,
    likedBy: ['user1', 'user3'],
    favorites: ['user2', 'user4'],
    comments: [
      {
        id: uuidv4(),
        userId: 'user1',
        userName: '小明',
        userAvatar: sampleUsers[0].avatar,
        content: '终于有篮球活动了！我要参加！',
        createdAt: now - 3600000
      },
      {
        id: uuidv4(),
        userId: 'user2',
        userName: '小红',
        userAvatar: sampleUsers[1].avatar,
        content: '我是新手，会不会拖后腿呀？',
        createdAt: now - 1800000
      }
    ],
    createdAt: now - 2 * dayMs,
    coverColor: coverColors[0]
  },
  {
    id: uuidv4(),
    title: '民谣吉他交流会',
    description: '喜欢吉他的朋友看过来！一起弹唱经典民谣，分享吉他技巧，以琴会友。请自带吉他，没有吉他也可以来听歌。',
    time: now + 3 * dayMs,
    location: '城市咖啡馆二楼',
    maxParticipants: 15,
    participants: [sampleUsers[1], sampleUsers[2], sampleUsers[3]],
    type: '音乐',
    tags: ['音乐', '吉他', '民谣', '弹唱', '咖啡'],
    likes: 23,
    likedBy: ['user2', 'user4', 'user5'],
    favorites: ['user1', 'user3', 'user5'],
    comments: [
      {
        id: uuidv4(),
        userId: 'user3',
        userName: '小华',
        userAvatar: sampleUsers[2].avatar,
        content: '我会弹《成都》，到时候弹给大家听！',
        createdAt: now - 7200000
      }
    ],
    createdAt: now - 3 * dayMs,
    coverColor: coverColors[1]
  },
  {
    id: uuidv4(),
    title: '《活着》读书分享会',
    description: '本月我们一起读余华的《活着》，欢迎读过或想读这本书的朋友来分享你的感悟。我们会准备茶点，轻松交流。',
    time: now + 5 * dayMs,
    location: '静谧书屋',
    maxParticipants: 10,
    participants: [sampleUsers[0], sampleUsers[2], sampleUsers[4]],
    type: '读书',
    tags: ['读书', '文学', '余华', '分享'],
    likes: 8,
    likedBy: ['user1', 'user3'],
    favorites: ['user4'],
    comments: [],
    createdAt: now - 1 * dayMs,
    coverColor: coverColors[2]
  },
  {
    id: uuidv4(),
    title: '桌游之夜：血染钟楼',
    description: '热门社交推理游戏血染钟楼！新手友好，现场有主持人教学。一起来烧脑推理，找出隐藏的恶魔！',
    time: now + 1 * dayMs,
    location: '桌游俱乐部',
    maxParticipants: 15,
    participants: [sampleUsers[0], sampleUsers[1], sampleUsers[2], sampleUsers[3], sampleUsers[4]],
    type: '桌游',
    tags: ['桌游', '推理', '社交', '血染钟楼'],
    likes: 31,
    likedBy: ['user1', 'user2', 'user3', 'user4', 'user5'],
    favorites: ['user1', 'user2', 'user3'],
    comments: [
      {
        id: uuidv4(),
        userId: 'user4',
        userName: '小李',
        userAvatar: sampleUsers[3].avatar,
        content: '上周玩过一次，太上头了！这周继续！',
        createdAt: now - 5400000
      },
      {
        id: uuidv4(),
        userId: 'user5',
        userName: '小王',
        userAvatar: sampleUsers[4].avatar,
        content: '新手可以参加吗？',
        createdAt: now - 3600000
      }
    ],
    createdAt: now - 4 * dayMs,
    coverColor: coverColors[3]
  },
  {
    id: uuidv4(),
    title: '香山徒步赏秋',
    description: '秋天到了，一起去香山看红叶！我们走轻松路线，适合大多数人，沿途拍照打卡，中午在山顶野餐。',
    time: now + 4 * dayMs,
    location: '香山公园东门集合',
    maxParticipants: 20,
    participants: [sampleUsers[3]],
    type: '户外',
    tags: ['户外', '徒步', '赏秋', '拍照', '野餐'],
    likes: 42,
    likedBy: ['user1', 'user2', 'user3', 'user4', 'user5'],
    favorites: ['user1', 'user2', 'user3', 'user4', 'user5'],
    comments: [
      {
        id: uuidv4(),
        userId: 'user1',
        userName: '小明',
        userAvatar: sampleUsers[0].avatar,
        content: '香山红叶超美！强烈推荐！',
        createdAt: now - 86400000
      }
    ],
    createdAt: now - 5 * dayMs,
    coverColor: coverColors[4]
  }
]

sampleActivities.forEach(activity => activities.set(activity.id, activity))

app.get('/api/activities', (_req: Request, res: Response) => {
  const activityList = Array.from(activities.values()).sort((a, b) => b.createdAt - a.createdAt)
  res.json(activityList)
})

app.get('/api/activities/:id', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }
  res.json(activity)
})

app.post('/api/activities', (req: Request, res: Response) => {
  const { title, description, time, location, maxParticipants, type } = req.body
  
  if (!title || !time || !location || !maxParticipants || !type) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  
  if (title.trim().length === 0) {
    return res.status(400).json({ error: '活动标题不能为空' })
  }
  
  if (time < Date.now()) {
    return res.status(400).json({ error: '活动时间不能早于当前时间' })
  }

  const newActivity: Activity = {
    id: uuidv4(),
    title: title.trim(),
    description: description || '',
    time,
    location,
    maxParticipants,
    participants: [],
    type,
    tags: [],
    likes: 0,
    likedBy: [],
    favorites: [],
    comments: [],
    createdAt: Date.now(),
    coverColor: coverColors[Math.floor(Math.random() * coverColors.length)]
  }

  activities.set(newActivity.id, newActivity)
  res.status(201).json(newActivity)
})

app.post('/api/activities/:id/register', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const { userId } = req.body
  const user = users.get(userId)
  
  if (!user) {
    const tempUser: User = {
      id: userId,
      name: `用户${userId.slice(0, 4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
    }
    users.set(userId, tempUser)
  }

  const participant = user || users.get(userId)!
  
  const isRegistered = activity.participants.some(p => p.id === participant.id)
  
  if (isRegistered) {
    activity.participants = activity.participants.filter(p => p.id !== participant.id)
  } else {
    if (activity.participants.length >= activity.maxParticipants) {
      return res.status(400).json({ error: '活动名额已满' })
    }
    activity.participants.push(participant)
  }

  activities.set(activity.id, activity)
  res.json({ activity, isRegistered: !isRegistered })
})

app.post('/api/activities/:id/like', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const { userId } = req.body
  const isLiked = activity.likedBy.includes(userId)

  if (isLiked) {
    activity.likedBy = activity.likedBy.filter(id => id !== userId)
    activity.likes--
  } else {
    activity.likedBy.push(userId)
    activity.likes++
  }

  activities.set(activity.id, activity)
  res.json({ activity, isLiked: !isLiked })
})

app.post('/api/activities/:id/favorite', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const { userId } = req.body
  const isFavorited = activity.favorites.includes(userId)

  if (isFavorited) {
    activity.favorites = activity.favorites.filter(id => id !== userId)
  } else {
    activity.favorites.push(userId)
  }

  activities.set(activity.id, activity)
  res.json({ activity, isFavorited: !isFavorited })
})

app.post('/api/activities/:id/comments', (req: Request, res: Response) => {
  const activity = activities.get(req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const { userId, userName, content } = req.body
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' })
  }

  const user = users.get(userId) || {
    id: userId,
    name: userName || '匿名用户',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
  }

  const newComment: Comment = {
    id: uuidv4(),
    userId,
    userName: user.name,
    userAvatar: user.avatar,
    content: content.trim(),
    createdAt: Date.now()
  }

  activity.comments.unshift(newComment)
  activities.set(activity.id, activity)
  res.status(201).json(newComment)
})

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.get(req.params.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  const registeredActivities = Array.from(activities.values())
    .filter(a => a.participants.some(p => p.id === user.id))
  
  const createdActivities = Array.from(activities.values())
    .filter(a => a.likedBy.includes(user.id))

  res.json({
    user,
    registeredActivities,
    likedActivities: createdActivities
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
