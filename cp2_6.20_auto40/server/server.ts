import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert'
export type ActivityType = 'hiking' | 'camping' | 'climbing' | 'cycling' | 'running' | 'swimming'

export interface Participant {
  id: string
  name: string
  avatar: string
  registeredAt: string
}

export interface Review {
  id: string
  activityId: string
  userId: string
  userName: string
  userAvatar: string
  imageUrl?: string
  content: string
  likes: number
  likedBy: string[]
  createdAt: string
}

export interface Activity {
  id: string
  title: string
  type: ActivityType
  date: string
  location: string
  maxParticipants: number
  participants: Participant[]
  difficulty: Difficulty
  description: string
  itinerary: string
  coverImage: string
  organizer: string
  createdAt: string
  status: 'upcoming' | 'ongoing' | 'ended'
}

export type EquipmentStatus = 'available' | 'borrowed'
export type EquipmentCategory = 'tent' | 'backpack' | 'sleeping_bag' | 'climbing' | 'cooking' | 'clothing' | 'navigation' | 'other'

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  description: string
  imageUrl: string
  status: EquipmentStatus
  ownerId: string
  ownerName: string
  borrowedBy?: string
  borrowedDate?: string
  returnDate?: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  avatar: string
  bio: string
  joinDate: string
  registeredActivities: string[]
  completedActivities: string[]
  borrowedEquipment: string[]
  totalBorrows: number
  hikingCount: number
  campingCount: number
  climbingCount: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  condition: string
}

const currentUserId = 'user-001'

const users: User[] = [
  {
    id: 'user-001',
    name: '林行者',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede',
    bio: '热爱自然，喜欢徒步登山。周末户外爱好者，追求自由与挑战！',
    joinDate: '2024-03-15',
    registeredActivities: ['act-001', 'act-002'],
    completedActivities: ['act-003', 'act-004'],
    borrowedEquipment: ['eq-001'],
    totalBorrows: 7,
    hikingCount: 4,
    campingCount: 2,
    climbingCount: 1
  },
  {
    id: 'user-002',
    name: '山谷风',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wind&backgroundColor=ffd5dc',
    bio: '户外摄影师，记录最美的山野风光。',
    joinDate: '2024-01-20',
    registeredActivities: ['act-001'],
    completedActivities: ['act-003'],
    borrowedEquipment: [],
    totalBorrows: 3,
    hikingCount: 3,
    campingCount: 1,
    climbingCount: 0
  },
  {
    id: 'user-003',
    name: '云游客',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cloud&backgroundColor=b6e3f4',
    bio: '资深驴友，十年户外经验。',
    joinDate: '2023-06-10',
    registeredActivities: [],
    completedActivities: ['act-003', 'act-004'],
    borrowedEquipment: [],
    totalBorrows: 12,
    hikingCount: 8,
    campingCount: 5,
    climbingCount: 3
  }
]

const activities: Activity[] = [
  {
    id: 'act-001',
    title: '黄山云海穿越',
    type: 'hiking',
    date: '2026-07-05T06:00:00',
    location: '安徽黄山风景区',
    maxParticipants: 20,
    participants: [
      { id: 'user-001', name: '林行者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede', registeredAt: '2026-06-15' },
      { id: 'user-002', name: '山谷风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wind&backgroundColor=ffd5dc', registeredAt: '2026-06-16' }
    ],
    difficulty: 'hard',
    description: '两天一夜黄山精华穿越，登顶光明顶观赏日出云海。行程包含西海大峡谷徒步，体验黄山奇松怪石。',
    itinerary: 'Day1: 云谷寺→白鹅岭→始信峰→北海→光明顶（宿山顶）\nDay2: 光明顶日出→西海大峡谷→玉屏楼→迎客松→慈光阁',
    coverImage: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-06-01T10:00:00',
    status: 'upcoming'
  },
  {
    id: 'act-002',
    title: '千岛湖露营之夜',
    type: 'camping',
    date: '2026-07-12T14:00:00',
    location: '浙江千岛湖露营基地',
    maxParticipants: 15,
    participants: [
      { id: 'user-001', name: '林行者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede', registeredAt: '2026-06-18' }
    ],
    difficulty: 'easy',
    description: '周末休闲露营，湖畔星空下烧烤聊天。适合新手体验，提供全套装备租赁。',
    itinerary: 'Day1: 下午集合→搭帐篷→湖边垂钓→烧烤晚餐→篝火晚会\nDay2: 看日出→早餐→皮划艇体验→收拾返程',
    coverImage: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-06-10T08:00:00',
    status: 'upcoming'
  },
  {
    id: 'act-003',
    title: '莫干山徒步挑战',
    type: 'hiking',
    date: '2026-05-18T07:00:00',
    location: '浙江莫干山',
    maxParticipants: 25,
    participants: [
      { id: 'user-001', name: '林行者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede', registeredAt: '2026-05-10' },
      { id: 'user-002', name: '山谷风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wind&backgroundColor=ffd5dc', registeredAt: '2026-05-11' },
      { id: 'user-003', name: '云游客', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cloud&backgroundColor=b6e3f4', registeredAt: '2026-05-08' }
    ],
    difficulty: 'moderate',
    description: '经典莫干山徒步路线，穿越竹林古道，探访民国老别墅。全程约15公里，累计爬升600米。',
    itinerary: '庾村→剑池→芦花荡→怪石角→莫干湖→后坞',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-04-20T09:00:00',
    status: 'ended'
  },
  {
    id: 'act-004',
    title: '崇明岛骑行环岛',
    type: 'cycling',
    date: '2026-04-26T06:30:00',
    location: '上海崇明岛',
    maxParticipants: 12,
    participants: [
      { id: 'user-001', name: '林行者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede', registeredAt: '2026-04-18' },
      { id: 'user-003', name: '云游客', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cloud&backgroundColor=b6e3f4', registeredAt: '2026-04-15' }
    ],
    difficulty: 'moderate',
    description: '崇明岛东线骑行，全程约85公里。沿途欣赏长江入海口风光，参观东滩湿地候鸟保护区。',
    itinerary: '陈家镇→东滩湿地→前哨农场→瀛东村→陈家镇',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-04-01T11:00:00',
    status: 'ended'
  },
  {
    id: 'act-005',
    title: '四姑娘山初级登山',
    type: 'climbing',
    date: '2026-08-08T05:00:00',
    location: '四川四姑娘山大峰',
    maxParticipants: 8,
    participants: [],
    difficulty: 'expert',
    description: '四姑娘山大峰海拔5025米，是入门级雪山攀登首选。需要有高海拔徒步经验，全程专业向导带队。',
    itinerary: 'Day1: 成都→日隆镇（3100m）适应\nDay2: 日隆→大本营（4300m）\nDay3: 大本营→登顶（5025m）→日隆\nDay4: 日隆→成都',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-06-18T12:00:00',
    status: 'upcoming'
  },
  {
    id: 'act-006',
    title: '西湖夜跑团练',
    type: 'running',
    date: '2026-06-25T19:00:00',
    location: '杭州西湖断桥',
    maxParticipants: 30,
    participants: [],
    difficulty: 'easy',
    description: '每周四固定活动，西湖夜景10公里慢跑。配速630-700，新人友好，跑后聚餐交流。',
    itinerary: '断桥→白堤→苏堤→南山路→湖滨→断桥',
    coverImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: '2026-06-19T16:00:00',
    status: 'upcoming'
  }
]

const equipment: Equipment[] = [
  {
    id: 'eq-001',
    name: '牧高笛冷山2帐篷',
    category: 'tent',
    description: '双人双层防风防雨帐篷，重量2.2kg，适合三季露营。',
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
    status: 'borrowed',
    ownerId: 'user-003',
    ownerName: '云游客',
    borrowedBy: 'user-001',
    borrowedDate: '2026-06-15',
    returnDate: '2026-06-22',
    createdAt: '2026-03-01'
  },
  {
    id: 'eq-002',
    name: 'Osprey Atmos 65L背包',
    category: 'backpack',
    description: '重装徒步背包，透气背负系统，适合3-5天徒步。',
    imageUrl: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '山谷风',
    createdAt: '2026-02-15'
  },
  {
    id: 'eq-003',
    name: '黑冰G700羽绒睡袋',
    category: 'sleeping_bag',
    description: '舒适温度-5℃，填充700蓬鹅绒，重量1.1kg。',
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '云游客',
    createdAt: '2026-01-20'
  },
  {
    id: 'eq-004',
    name: '攀索攀岩套装',
    category: 'climbing',
    description: '含头盔、安全带、主锁、保护器、扁带等全套装备。',
    imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '云游客',
    createdAt: '2026-04-05'
  },
  {
    id: 'eq-005',
    name: '户外便携炉具套装',
    category: 'cooking',
    description: '气炉+套锅组合，折叠收纳，适合2-3人户外烹饪。',
    imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '山谷风',
    createdAt: '2026-03-12'
  },
  {
    id: 'eq-006',
    name: '冲锋衣（男款M码）',
    category: 'clothing',
    description: '三层压胶防水透气冲锋衣，适合恶劣天气徒步。',
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-001',
    ownerName: '林行者',
    createdAt: '2026-05-01'
  },
  {
    id: 'eq-007',
    name: 'Garmin GPS导航仪',
    category: 'navigation',
    description: '手持GPS，预加载等高线地图，续航20小时。',
    imageUrl: 'https://images.unsplash.com/photo-1551836027-6bfde19e169b?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '云游客',
    createdAt: '2026-02-28'
  },
  {
    id: 'eq-008',
    name: '登山杖（一对）',
    category: 'other',
    description: '碳素纤维三节伸缩登山杖，带防震系统。',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '山谷风',
    createdAt: '2026-04-18'
  },
  {
    id: 'eq-009',
    name: '防潮垫（蛋槽型）',
    category: 'sleeping_bag',
    description: 'R值2.0，折叠式蛋槽防潮垫，轻便保暖。',
    imageUrl: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-001',
    ownerName: '林行者',
    createdAt: '2026-05-15'
  },
  {
    id: 'eq-010',
    name: '头灯（LED）',
    category: 'other',
    description: '500流明高亮头灯，IPX6防水，多种模式可调。',
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '云游客',
    createdAt: '2026-01-10'
  },
  {
    id: 'eq-011',
    name: '速干T恤（女款M码）',
    category: 'clothing',
    description: '冰感速干面料，UPF50+防晒，适合春夏户外活动。',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '山谷风',
    createdAt: '2026-06-01'
  },
  {
    id: 'eq-012',
    name: '多功能工兵铲',
    category: 'other',
    description: '折叠式多功能工兵铲，含铲、刀、锯、开瓶器等功能。',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=300&fit=crop',
    status: 'available',
    ownerId: 'user-001',
    ownerName: '林行者',
    createdAt: '2026-06-10'
  }
]

const reviews: Review[] = [
  {
    id: 'rev-001',
    activityId: 'act-003',
    userId: 'user-002',
    userName: '山谷风',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wind&backgroundColor=ffd5dc',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop',
    content: '莫干山的竹林真的太美了！清晨阳光穿过竹叶洒在石阶上，那种感觉无与伦比。同行的小伙伴都很nice，期待下次再约！',
    likes: 12,
    likedBy: ['user-001'],
    createdAt: '2026-05-19T18:30:00'
  },
  {
    id: 'rev-002',
    activityId: 'act-003',
    userId: 'user-001',
    userName: '林行者',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest&backgroundColor=c0aede',
    content: '第一次走莫干山，路线很经典，强度适中。领队经验丰富，一路讲解植物知识，收获满满！推荐大家都来体验。',
    likes: 8,
    likedBy: ['user-003', 'user-002'],
    createdAt: '2026-05-19T20:15:00'
  },
  {
    id: 'rev-003',
    activityId: 'act-004',
    userId: 'user-003',
    userName: '云游客',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cloud&backgroundColor=b6e3f4',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    content: '崇明岛骑行超赞！沿途风景美不胜收，东滩湿地看到了很多候鸟。虽然距离不短，但路况平整，骑起来很舒服。',
    likes: 15,
    likedBy: ['user-001'],
    createdAt: '2026-04-27T16:45:00'
  }
]

const achievements: Achievement[] = [
  {
    id: 'ach-001',
    name: '初出茅庐',
    description: '完成第一次户外活动',
    icon: '🌱',
    unlocked: true,
    condition: '参加并完成1次活动'
  },
  {
    id: 'ach-002',
    name: '徒步达人',
    description: '累计参加5次徒步活动',
    icon: '🥾',
    unlocked: false,
    condition: '参加5次徒步活动（当前4/5）'
  },
  {
    id: 'ach-003',
    name: '露营专家',
    description: '累计参加3次露营活动',
    icon: '⛺',
    unlocked: false,
    condition: '参加3次露营活动（当前2/3）'
  },
  {
    id: 'ach-004',
    name: '登山英雄',
    description: '完成一次登山活动',
    icon: '🏔️',
    unlocked: false,
    condition: '参加1次登山活动（当前0/1）'
  },
  {
    id: 'ach-005',
    name: '装备达人',
    description: '累计借用10件装备',
    icon: '🎒',
    unlocked: false,
    condition: '借用10件装备（当前7/10）'
  },
  {
    id: 'ach-006',
    name: '活跃先锋',
    description: '报名超过10次活动',
    icon: '🏃',
    unlocked: false,
    condition: '报名10次活动（当前6/10）'
  },
  {
    id: 'ach-007',
    name: '骑行骑士',
    description: '参加3次骑行活动',
    icon: '🚴',
    unlocked: false,
    condition: '参加3次骑行活动（当前1/3）'
  },
  {
    id: 'ach-008',
    name: '社群领袖',
    description: '组织5次活动',
    icon: '👥',
    unlocked: false,
    condition: '组织5次活动（当前0/5）'
  }
]

const addDelay = (res: Response) => new Promise<void>(resolve => {
  const delay = Math.floor(Math.random() * 50)
  setTimeout(() => resolve(), delay)
})

app.get('/api/user', async (req: Request, res: Response) => {
  await addDelay(res)
  const user = users.find(u => u.id === currentUserId)
  res.json(user)
})

app.get('/api/activities', async (req: Request, res: Response) => {
  await addDelay(res)
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const start = (page - 1) * limit
  const end = start + limit
  res.json({
    data: activities.slice(start, end),
    total: activities.length,
    page,
    limit
  })
})

app.get('/api/activities/:id', async (req: Request, res: Response) => {
  await addDelay(res)
  const activity = activities.find(a => a.id === req.params.id)
  if (!activity) {
    res.status(404).json({ error: '活动不存在' })
    return
  }
  res.json(activity)
})

app.post('/api/activities', async (req: Request, res: Response) => {
  await addDelay(res)
  const { title, type, date, location, maxParticipants, difficulty, description, itinerary, coverImage } = req.body
  const newActivity: Activity = {
    id: `act-${uuidv4().slice(0, 8)}`,
    title,
    type,
    date,
    location,
    maxParticipants,
    participants: [],
    difficulty,
    description,
    itinerary,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop',
    organizer: '山野行者俱乐部',
    createdAt: new Date().toISOString(),
    status: 'upcoming'
  }
  activities.unshift(newActivity)
  res.status(201).json(newActivity)
})

app.post('/api/activities/:id/register', async (req: Request, res: Response) => {
  await addDelay(res)
  const activity = activities.find(a => a.id === req.params.id)
  if (!activity) {
    res.status(404).json({ error: '活动不存在' })
    return
  }
  const user = users.find(u => u.id === currentUserId)
  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }
  if (activity.participants.some(p => p.id === currentUserId)) {
    res.status(400).json({ error: '您已报名此活动' })
    return
  }
  if (activity.participants.length >= activity.maxParticipants) {
    res.status(400).json({ error: '活动人数已满' })
    return
  }
  const participant: Participant = {
    id: currentUserId,
    name: user.name,
    avatar: user.avatar,
    registeredAt: new Date().toISOString().split('T')[0]
  }
  activity.participants.push(participant)
  if (!user.registeredActivities.includes(activity.id)) {
    user.registeredActivities.push(activity.id)
  }
  res.json({ success: true, activity })
})

app.post('/api/activities/:id/unregister', async (req: Request, res: Response) => {
  await addDelay(res)
  const activity = activities.find(a => a.id === req.params.id)
  if (!activity) {
    res.status(404).json({ error: '活动不存在' })
    return
  }
  activity.participants = activity.participants.filter(p => p.id !== currentUserId)
  const user = users.find(u => u.id === currentUserId)
  if (user) {
    user.registeredActivities = user.registeredActivities.filter(id => id !== activity.id)
  }
  res.json({ success: true, activity })
})

app.get('/api/equipment', async (req: Request, res: Response) => {
  await addDelay(res)
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const category = req.query.category as string
  const search = req.query.search as string
  let filtered = [...equipment]
  if (category && category !== 'all') {
    filtered = filtered.filter(e => e.category === category)
  }
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(e => 
      e.name.toLowerCase().includes(s) || 
      e.description.toLowerCase().includes(s)
    )
  }
  const start = (page - 1) * limit
  const end = start + limit
  res.json({
    data: filtered.slice(start, end),
    total: filtered.length,
    page,
    limit
  })
})

app.post('/api/equipment/:id/borrow', async (req: Request, res: Response) => {
  await addDelay(res)
  const eq = equipment.find(e => e.id === req.params.id)
  if (!eq) {
    res.status(404).json({ error: '装备不存在' })
    return
  }
  if (eq.status === 'borrowed') {
    res.status(400).json({ error: '装备已被借出' })
    return
  }
  const { days } = req.body
  const borrowDays = days || 7
  const today = new Date()
  const returnDate = new Date(today)
  returnDate.setDate(today.getDate() + borrowDays)
  eq.status = 'borrowed'
  eq.borrowedBy = currentUserId
  eq.borrowedDate = today.toISOString().split('T')[0]
  eq.returnDate = returnDate.toISOString().split('T')[0]
  const user = users.find(u => u.id === currentUserId)
  if (user) {
    user.borrowedEquipment.push(eq.id)
    user.totalBorrows++
  }
  res.json({ success: true, equipment: eq })
})

app.post('/api/equipment/:id/return', async (req: Request, res: Response) => {
  await addDelay(res)
  const eq = equipment.find(e => e.id === req.params.id)
  if (!eq) {
    res.status(404).json({ error: '装备不存在' })
    return
  }
  eq.status = 'available'
  eq.borrowedBy = undefined
  eq.borrowedDate = undefined
  eq.returnDate = undefined
  res.json({ success: true, equipment: eq })
})

app.get('/api/reviews/:activityId', async (req: Request, res: Response) => {
  await addDelay(res)
  const activityReviews = reviews
    .filter(r => r.activityId === req.params.activityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json(activityReviews)
})

app.post('/api/reviews/:activityId', async (req: Request, res: Response) => {
  await addDelay(res)
  const user = users.find(u => u.id === currentUserId)
  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }
  const { imageUrl, content } = req.body
  const newReview: Review = {
    id: `rev-${uuidv4().slice(0, 8)}`,
    activityId: req.params.activityId,
    userId: currentUserId,
    userName: user.name,
    userAvatar: user.avatar,
    imageUrl: imageUrl || undefined,
    content,
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString()
  }
  reviews.unshift(newReview)
  res.status(201).json(newReview)
})

app.post('/api/reviews/:id/like', async (req: Request, res: Response) => {
  await addDelay(res)
  const review = reviews.find(r => r.id === req.params.id)
  if (!review) {
    res.status(404).json({ error: '评论不存在' })
    return
  }
  if (review.likedBy.includes(currentUserId)) {
    review.likes--
    review.likedBy = review.likedBy.filter(id => id !== currentUserId)
  } else {
    review.likes++
    review.likedBy.push(currentUserId)
  }
  res.json({ success: true, review })
})

app.get('/api/achievements', async (req: Request, res: Response) => {
  await addDelay(res)
  const user = users.find(u => u.id === currentUserId)
  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }
  const totalActivities = user.hikingCount + user.campingCount + user.climbingCount
  const dynamicAchievements: Achievement[] = achievements.map(a => {
    let unlocked = a.unlocked
    if (a.id === 'ach-001') unlocked = totalActivities >= 1
    if (a.id === 'ach-002') unlocked = user.hikingCount >= 5
    if (a.id === 'ach-003') unlocked = user.campingCount >= 3
    if (a.id === 'ach-004') unlocked = user.climbingCount >= 1
    if (a.id === 'ach-005') unlocked = user.totalBorrows >= 10
    if (a.id === 'ach-006') unlocked = user.registeredActivities.length + user.completedActivities.length >= 10
    return { ...a, unlocked }
  })
  res.json(dynamicAchievements)
})

app.get('/api/user/activities', async (req: Request, res: Response) => {
  await addDelay(res)
  const user = users.find(u => u.id === currentUserId)
  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }
  const allIds = [...user.registeredActivities, ...user.completedActivities]
  const userActivities = activities.filter(a => allIds.includes(a.id))
  res.json(userActivities)
})

app.listen(PORT, () => {
  console.log(`🏔️  山野行者俱乐部服务器已启动: http://localhost:${PORT}`)
})
