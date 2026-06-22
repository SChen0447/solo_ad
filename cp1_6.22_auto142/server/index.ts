import express from 'express'
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
  role: 'volunteer' | 'organizer'
  totalHours: number
  activityCount: number
}

interface Activity {
  id: string
  title: string
  description: string
  organizer: string
  organizerId: string
  date: string
  location: string
  maxParticipants: number
  registrationDeadline: string
  coverImage: string
  estimatedHours: number
  registrants: string[]
  confirmedAttendees: string[]
  status: 'upcoming' | 'ongoing' | 'completed'
}

interface WorkRecord {
  id: string
  userId: string
  activityId: string
  activityTitle: string
  date: string
  hours: number
  review: string
  organizer: string
}

const users: User[] = [
  {
    id: 'user-1',
    name: '张小明',
    avatar: '',
    role: 'volunteer',
    totalHours: 67.5,
    activityCount: 12,
  },
  {
    id: 'user-2',
    name: '社区服务中心',
    avatar: '',
    role: 'organizer',
    totalHours: 0,
    activityCount: 0,
  },
  {
    id: 'user-3',
    name: '李华',
    avatar: '',
    role: 'volunteer',
    totalHours: 34,
    activityCount: 7,
  },
]

const activities: Activity[] = [
  {
    id: 'act-1',
    title: '城市公园环保清洁行动',
    description: '清理公园内垃圾，维护城市绿地环境，增强市民环保意识。活动包括垃圾分类讲解和实际清洁操作。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-06-28T09:00:00',
    location: '中央公园东门广场',
    maxParticipants: 30,
    registrationDeadline: '2026-06-26T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=volunteers%20cleaning%20park%20green%20nature%20sunny%20day%20community%20service&image_size=landscape_16_9',
    estimatedHours: 4,
    registrants: ['user-1', 'user-3'],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-2',
    title: '养老院老人陪护活动',
    description: '前往社区养老院，陪伴老人聊天、读报、表演节目，为老人们带去温暖与关怀。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-06-30T14:00:00',
    location: '阳光养老院',
    maxParticipants: 15,
    registrationDeadline: '2026-06-28T12:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=volunteers%20visiting%20elderly%20nursing%20home%20warm%20caring%20community&image_size=landscape_16_9',
    estimatedHours: 3,
    registrants: ['user-1'],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-3',
    title: '七一建党节社区庆典',
    description: '协助组织社区建党节文艺汇演，包括场地布置、观众引导、后勤保障等工作。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-01T08:00:00',
    location: '社区文化广场',
    maxParticipants: 50,
    registrationDeadline: '2026-06-29T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=community%20celebration%20festival%20stage%20red%20decorations%20crowd%20happy&image_size=landscape_16_9',
    estimatedHours: 8,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-4',
    title: '社区图书馆整理志愿服务',
    description: '协助图书馆管理员整理图书、分类上架、维护阅读环境，为社区居民提供良好的阅读空间。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-05T10:00:00',
    location: '社区图书馆',
    maxParticipants: 10,
    registrationDeadline: '2026-07-03T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=library%20bookshelves%20volunteers%20organizing%20books%20quiet%20reading%20space&image_size=landscape_16_9',
    estimatedHours: 3.5,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-5',
    title: '小学生课业辅导志愿活动',
    description: '为社区内留守儿童和困难家庭子女提供课业辅导，帮助他们解决学习难题。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-08T15:00:00',
    location: '社区活动中心教室',
    maxParticipants: 8,
    registrationDeadline: '2026-07-06T12:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tutoring%20children%20classroom%20volunteers%20helping%20students%20education&image_size=landscape_16_9',
    estimatedHours: 3,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-6',
    title: '河道环境巡查与清洁',
    description: '巡查社区附近河道，清理河岸垃圾，记录水质情况，宣传水资源保护知识。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-10T07:30:00',
    location: '清溪河畔',
    maxParticipants: 20,
    registrationDeadline: '2026-07-08T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=river%20cleanup%20volunteers%20nature%20water%20conservation%20environmental&image_size=landscape_16_9',
    estimatedHours: 4.5,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-7',
    title: '社区义诊志愿服务',
    description: '协助社区医院开展免费义诊活动，负责引导居民、维持秩序、记录信息等工作。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-12T08:30:00',
    location: '社区卫生服务中心',
    maxParticipants: 12,
    registrationDeadline: '2026-07-10T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medical%20clinic%20volunteer%20health%20checkup%20community%20doctor%20caring&image_size=landscape_16_9',
    estimatedHours: 5,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-8',
    title: '社区运动会后勤保障',
    description: '协助组织社区秋季运动会，包括运动员签到、物资分发、场地维护等工作。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-15T07:00:00',
    location: '社区体育场',
    maxParticipants: 25,
    registrationDeadline: '2026-07-13T12:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sports%20day%20community%20stadium%20volunteers%20colorful%20energetic%20outdoor&image_size=landscape_16_9',
    estimatedHours: 7,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-9',
    title: '社区花园种植养护',
    description: '在社区公共花园种植花卉绿植，学习园艺知识，共同打造美丽社区环境。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-18T09:00:00',
    location: '社区中心花园',
    maxParticipants: 18,
    registrationDeadline: '2026-07-16T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=community%20garden%20planting%20flowers%20volunteers%20green%20hands%20gardening&image_size=landscape_16_9',
    estimatedHours: 3.5,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
  {
    id: 'act-10',
    title: '爱心衣物捐赠整理',
    description: '整理社区居民捐赠的衣物，分类、打包、运送至爱心捐赠点，传递温暖。',
    organizer: '社区服务中心',
    organizerId: 'user-2',
    date: '2026-07-20T10:00:00',
    location: '社区物资仓库',
    maxParticipants: 16,
    registrationDeadline: '2026-07-18T18:00:00',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=clothing%20donation%20volunteers%20sorting%20charity%20boxes%20community%20giving&image_size=landscape_16_9',
    estimatedHours: 4,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  },
]

const workRecords: WorkRecord[] = [
  {
    id: 'rec-1',
    userId: 'user-1',
    activityId: 'past-1',
    activityTitle: '春季社区植树活动',
    date: '2026-03-12',
    hours: 4.5,
    review: '工作认真负责，积极主动，团队协作精神强！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-2',
    userId: 'user-1',
    activityId: 'past-2',
    activityTitle: '关爱留守儿童陪伴活动',
    date: '2026-04-05',
    hours: 6,
    review: '耐心细致，深受孩子们喜爱，期待下次继续参与！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-3',
    userId: 'user-1',
    activityId: 'past-3',
    activityTitle: '五一劳动节社区大扫除',
    date: '2026-05-01',
    hours: 5,
    review: '吃苦耐劳，脏活累活抢着干，表现非常优秀！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-4',
    userId: 'user-1',
    activityId: 'past-4',
    activityTitle: '母亲节鲜花义卖活动',
    date: '2026-05-10',
    hours: 7,
    review: '沟通能力强，销售业绩突出，展现了良好的志愿者风貌。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-5',
    userId: 'user-1',
    activityId: 'past-5',
    activityTitle: '端午包粽子送老人',
    date: '2026-06-10',
    hours: 4,
    review: '心灵手巧，组织有序，老人们都非常开心！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-6',
    userId: 'user-1',
    activityId: 'past-6',
    activityTitle: '世界环境日宣传活动',
    date: '2026-06-05',
    hours: 5,
    review: '积极宣传环保理念，发放宣传资料，态度热情周到。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-7',
    userId: 'user-1',
    activityId: 'past-7',
    activityTitle: '高考考点志愿服务',
    date: '2026-06-07',
    hours: 8,
    review: '坚守岗位，为考生和家长提供贴心服务，获得一致好评！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-8',
    userId: 'user-1',
    activityId: 'past-8',
    activityTitle: '社区消防安全演练',
    date: '2026-05-25',
    hours: 3,
    review: '认真学习消防知识，积极配合演练，安全意识强。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-9',
    userId: 'user-1',
    activityId: 'past-9',
    activityTitle: '社区儿童绘本共读',
    date: '2026-04-20',
    hours: 2.5,
    review: '绘声绘色地为孩子们讲故事，互动效果极佳！',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-10',
    userId: 'user-1',
    activityId: 'past-10',
    activityTitle: '爱心早餐送温暖',
    date: '2026-04-01',
    hours: 4,
    review: '清晨早早到位，为环卫工人送上热乎的早餐，爱心满满。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-11',
    userId: 'user-1',
    activityId: 'past-11',
    activityTitle: '社区宠物科普宣传',
    date: '2026-03-20',
    hours: 3.5,
    review: '专业知识扎实，耐心解答居民疑问，活动效果好。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-12',
    userId: 'user-1',
    activityId: 'past-12',
    activityTitle: '社区反诈知识宣讲',
    date: '2026-03-08',
    hours: 5,
    review: '宣讲生动有趣，案例分析透彻，有效提升了居民防骗意识。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-13',
    userId: 'user-3',
    activityId: 'past-1',
    activityTitle: '春季社区植树活动',
    date: '2026-03-12',
    hours: 4,
    review: '表现良好，团队协作积极。',
    organizer: '社区服务中心',
  },
  {
    id: 'rec-14',
    userId: 'user-3',
    activityId: 'past-3',
    activityTitle: '五一劳动节社区大扫除',
    date: '2026-05-01',
    hours: 5,
    review: '认真负责，值得表扬！',
    organizer: '社区服务中心',
  },
]

const BADGE_THRESHOLDS = [
  { name: '铜色志愿者', hours: 10, color: '#cd7f32', icon: '🥉' },
  { name: '银色志愿者', hours: 50, color: '#c0c0c0', icon: '🥈' },
  { name: '金色志愿者', hours: 100, color: '#ffd700', icon: '🥇' },
  { name: '环保先锋', hours: 10, color: '#2b9348', icon: '🌿', category: '环保活动', requires: 2 },
  { name: '守护夕阳', hours: 10, color: '#ff8c00', icon: '🌅', category: '老人陪护', requires: 2 },
  { name: '儿童守护天使', hours: 10, color: '#ff69b4', icon: '👼', category: '儿童相关', requires: 2 },
  { name: '节日之星', hours: 8, color: '#ff4757', icon: '🎉', category: '节日活动', requires: 2 },
  { name: '全能志愿者', hours: 80, color: '#8b5cf6', icon: '⭐', category: '综合', requires: 10 },
  { name: '社区之光', hours: 150, color: '#00d4ff', icon: '💎', category: '终身成就', requires: 20 },
]

app.get('/api/activities', (req, res) => {
  const { page = '1', limit = '6' } = req.query
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const start = (pageNum - 1) * limitNum
  const end = start + limitNum
  const paginated = activities.slice(start, end)
  res.json({
    data: paginated,
    total: activities.length,
    page: pageNum,
    limit: limitNum,
    hasMore: end < activities.length,
  })
})

app.get('/api/activities/:id', (req, res) => {
  const activity = activities.find((a) => a.id === req.params.id)
  if (!activity) return res.status(404).json({ error: '活动不存在' })
  res.json(activity)
})

app.post('/api/activities', (req, res) => {
  const { title, description, date, location, maxParticipants, registrationDeadline, coverImage, estimatedHours, organizerId } = req.body
  const organizer = users.find((u) => u.id === organizerId)
  if (!organizer || organizer.role !== 'organizer') {
    return res.status(403).json({ error: '只有组织者可以发布活动' })
  }
  const newActivity: Activity = {
    id: 'act-' + uuidv4(),
    title,
    description,
    organizer: organizer.name,
    organizerId,
    date,
    location,
    maxParticipants,
    registrationDeadline,
    coverImage: coverImage || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=community%20volunteer%20activity%20banner&image_size=landscape_16_9',
    estimatedHours: estimatedHours || 4,
    registrants: [],
    confirmedAttendees: [],
    status: 'upcoming',
  }
  activities.push(newActivity)
  res.status(201).json(newActivity)
})

app.post('/api/activities/:id/register', (req, res) => {
  const { userId } = req.body
  const activity = activities.find((a) => a.id === req.params.id)
  if (!activity) return res.status(404).json({ error: '活动不存在' })
  if (activity.registrants.includes(userId)) {
    return res.status(400).json({ error: '您已报名该活动' })
  }
  if (activity.registrants.length >= activity.maxParticipants) {
    return res.status(400).json({ error: '活动名额已满' })
  }
  if (new Date(activity.registrationDeadline) < new Date()) {
    return res.status(400).json({ error: '报名已截止' })
  }
  activity.registrants.push(userId)
  res.json({ success: true, activity })
})

app.get('/api/activities/:id/registrants', (req, res) => {
  const activity = activities.find((a) => a.id === req.params.id)
  if (!activity) return res.status(404).json({ error: '活动不存在' })
  const registrantUsers = activity.registrants.map((uid) => {
    const user = users.find((u) => u.id === uid)
    return {
      id: uid,
      name: user?.name || '未知用户',
      avatar: user?.avatar || '',
      confirmed: activity.confirmedAttendees.includes(uid),
    }
  })
  res.json(registrantUsers)
})

app.post('/api/activities/:id/confirm', (req, res) => {
  const { userId, hours, review } = req.body
  const activity = activities.find((a) => a.id === req.params.id)
  if (!activity) return res.status(404).json({ error: '活动不存在' })
  if (!activity.registrants.includes(userId)) {
    return res.status(400).json({ error: '该用户未报名此活动' })
  }
  if (activity.confirmedAttendees.includes(userId)) {
    return res.status(400).json({ error: '该用户已确认过工时' })
  }
  activity.confirmedAttendees.push(userId)
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.totalHours = Math.round((user.totalHours + hours) * 2) / 2
    user.activityCount += 1
  }
  const record: WorkRecord = {
    id: 'rec-' + uuidv4(),
    userId,
    activityId: activity.id,
    activityTitle: activity.title,
    date: new Date(activity.date).toISOString().split('T')[0],
    hours: Math.round(hours * 2) / 2,
    review: review || '表现优秀，感谢参与！',
    organizer: activity.organizer,
  }
  workRecords.push(record)
  res.json({ success: true, record, user })
})

app.get('/api/users/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const userRecords = workRecords.filter((r) => r.userId === user.id)
  const earnedBadges = BADGE_THRESHOLDS.filter((badge) => user.totalHours >= badge.hours).map((b) => b.name)
  res.json({ ...user, earnedBadges })
})

app.get('/api/users/:id/records', (req, res) => {
  const userRecords = workRecords
    .filter((r) => r.userId === req.params.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  res.json(userRecords)
})

app.get('/api/users/:id/badges', (req, res) => {
  const user = users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const userRecords = workRecords.filter((r) => r.userId === user.id)
  const categoryCount: Record<string, number> = {}
  userRecords.forEach((r) => {
    const title = r.activityTitle
    if (title.includes('环保') || title.includes('清洁') || title.includes('植树') || title.includes('河道') || title.includes('花园')) {
      categoryCount['环保活动'] = (categoryCount['环保活动'] || 0) + 1
    }
    if (title.includes('老人') || title.includes('养老院') || title.includes('夕阳') || title.includes('粽子')) {
      categoryCount['老人陪护'] = (categoryCount['老人陪护'] || 0) + 1
    }
    if (title.includes('儿童') || title.includes('小学') || title.includes('留守') || title.includes('绘本')) {
      categoryCount['儿童相关'] = (categoryCount['儿童相关'] || 0) + 1
    }
    if (title.includes('节') || title.includes('庆典') || title.includes('义卖')) {
      categoryCount['节日活动'] = (categoryCount['节日活动'] || 0) + 1
    }
  })
  const badges = BADGE_THRESHOLDS.map((badge) => {
    let earned = user.totalHours >= badge.hours
    if (badge.category && badge.requires) {
      earned = earned && (categoryCount[badge.category] || 0) >= badge.requires
    }
    return { ...badge, earned, progress: categoryCount[badge.category] || 0 }
  })
  res.json(badges)
})

app.post('/api/users/register', (req, res) => {
  const { name, role = 'volunteer' } = req.body
  const existingUser = users.find((u) => u.name === name)
  if (existingUser) {
    return res.json(existingUser)
  }
  const newUser: User = {
    id: 'user-' + uuidv4(),
    name,
    avatar: '',
    role: role as 'volunteer' | 'organizer',
    totalHours: 0,
    activityCount: 0,
  }
  users.push(newUser)
  res.status(201).json(newUser)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
