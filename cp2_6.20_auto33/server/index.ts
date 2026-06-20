import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface User {
  id: string
  username: string
  password: string
  role: 'member' | 'coach' | 'admin'
  name: string
  avatar: string
  disabled: boolean
}

interface Course {
  id: string
  name: string
  startTime: string
  endTime: string
  coachId: string
  maxCapacity: number
  currentCapacity: number
  status: 'normal' | 'cancelled'
  cancelReason?: string
  bookedMembers: string[]
}

const usersMap = new Map<string, User>()
const coursesMap = new Map<string, Course>()
const tokensMap = new Map<string, string>()

const coachAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

function initData() {
  const users: User[] = [
    {
      id: uuidv4(),
      username: 'member1',
      password: '123456',
      role: 'member',
      name: '张小明',
      avatar: coachAvatar('member1'),
      disabled: false
    },
    {
      id: uuidv4(),
      username: 'member2',
      password: '123456',
      role: 'member',
      name: '李小红',
      avatar: coachAvatar('member2'),
      disabled: false
    },
    {
      id: uuidv4(),
      username: 'coach1',
      password: '123456',
      role: 'coach',
      name: '王教练',
      avatar: coachAvatar('coach1'),
      disabled: false
    },
    {
      id: uuidv4(),
      username: 'coach2',
      password: '123456',
      role: 'coach',
      name: '刘教练',
      avatar: coachAvatar('coach2'),
      disabled: false
    },
    {
      id: uuidv4(),
      username: 'admin',
      password: '123456',
      role: 'admin',
      name: '管理员',
      avatar: coachAvatar('admin'),
      disabled: false
    }
  ]

  users.forEach(user => {
    usersMap.set(user.id, user)
  })

  const coach1 = users.find(u => u.role === 'coach' && u.username === 'coach1')!
  const coach2 = users.find(u => u.role === 'coach' && u.username === 'coach2')!

  const today = dayjs()
  const courseNames = ['瑜伽课', '动感单车', '力量训练', '有氧操', '普拉提', '搏击操', '拉伸放松']

  for (let day = 0; day < 7; day++) {
    const date = today.add(day, 'day')
    const coursesPerDay = 3 + Math.floor(Math.random() * 2)

    for (let i = 0; i < coursesPerDay; i++) {
      const startHour = 8 + i * 3
      if (startHour >= 20) break

      const courseName = courseNames[Math.floor(Math.random() * courseNames.length)]
      const coach = Math.random() > 0.5 ? coach1 : coach2
      const maxCapacity = 10 + Math.floor(Math.random() * 10)

      const course: Course = {
        id: uuidv4(),
        name: courseName,
        startTime: date.hour(startHour).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
        endTime: date.hour(startHour + 1).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
        coachId: coach.id,
        maxCapacity,
        currentCapacity: Math.floor(Math.random() * maxCapacity),
        status: 'normal',
        bookedMembers: []
      }

      coursesMap.set(course.id, course)
    }
  }
}

initData()

function getUserByToken(token: string): User | undefined {
  const userId = tokensMap.get(token)
  if (!userId) return undefined
  return usersMap.get(userId)
}

function authMiddleware(roles: User['role'][]) {
  return (req: Request, res: Response, next: () => void) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: '未登录' })
    }
    const user = getUserByToken(token)
    if (!user) {
      return res.status(401).json({ message: '登录已过期' })
    }
    if (user.disabled) {
      return res.status(403).json({ message: '账户已被禁用' })
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: '权限不足' })
    }
    ;(req as any).user = user
    next()
  }
}

app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body
  const user = Array.from(usersMap.values()).find(
    u => u.username === username && u.password === password
  )

  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' })
  }

  if (user.disabled) {
    return res.status(403).json({ message: '账户已被禁用' })
  }

  const token = uuidv4()
  tokensMap.set(token, user.id)

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      avatar: user.avatar
    }
  })
})

app.post('/api/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    tokensMap.delete(token)
  }
  res.json({ message: '登出成功' })
})

app.get('/api/courses', authMiddleware(['member', 'coach', 'admin']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const { date } = req.query

  let courses = Array.from(coursesMap.values())

  if (date) {
    const targetDate = dayjs(date as string).format('YYYY-MM-DD')
    courses = courses.filter(c => dayjs(c.startTime).format('YYYY-MM-DD') === targetDate)
  }

  const coursesWithCoach = courses.map(course => {
    const coach = usersMap.get(course.coachId)
    return {
      ...course,
      coachName: coach?.name || '未知教练',
      coachAvatar: coach?.avatar || '',
      isBooked: course.bookedMembers.includes(user.id)
    }
  })

  coursesWithCoach.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())

  res.json(coursesWithCoach)
})

app.get('/api/courses/upcoming', authMiddleware(['member']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const today = dayjs().startOf('day')
  const nextWeek = today.add(7, 'day')

  const courses = Array.from(coursesMap.values())
    .filter(c => {
      const courseDate = dayjs(c.startTime)
      return courseDate.isAfter(today) && courseDate.isBefore(nextWeek)
    })
    .map(course => {
      const coach = usersMap.get(course.coachId)
      return {
        ...course,
        coachName: coach?.name || '未知教练',
        coachAvatar: coach?.avatar || '',
        isBooked: course.bookedMembers.includes(user.id)
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())

  res.json(courses)
})

app.post('/api/book', authMiddleware(['member']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const { courseId } = req.body

  const course = coursesMap.get(courseId)
  if (!course) {
    return res.status(404).json({ message: '课程不存在' })
  }

  if (course.status === 'cancelled') {
    return res.status(400).json({ message: '课程已取消' })
  }

  if (course.bookedMembers.includes(user.id)) {
    return res.status(400).json({ message: '您已预约该课程' })
  }

  if (course.currentCapacity >= course.maxCapacity) {
    return res.status(400).json({ message: '课程名额已满' })
  }

  course.currentCapacity += 1
  course.bookedMembers.push(user.id)

  const coach = usersMap.get(course.coachId)
  res.json({
    ...course,
    coachName: coach?.name || '未知教练',
    coachAvatar: coach?.avatar || '',
    isBooked: true
  })
})

app.post('/api/cancel-booking', authMiddleware(['member']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const { courseId } = req.body

  const course = coursesMap.get(courseId)
  if (!course) {
    return res.status(404).json({ message: '课程不存在' })
  }

  const index = course.bookedMembers.indexOf(user.id)
  if (index === -1) {
    return res.status(400).json({ message: '您未预约该课程' })
  }

  course.bookedMembers.splice(index, 1)
  course.currentCapacity -= 1

  const coach = usersMap.get(course.coachId)
  res.json({
    ...course,
    coachName: coach?.name || '未知教练',
    coachAvatar: coach?.avatar || '',
    isBooked: false
  })
})

app.get('/api/my-bookings', authMiddleware(['member']), (req: Request, res: Response) => {
  const user = (req as any).user as User

  const bookings = Array.from(coursesMap.values())
    .filter(c => c.bookedMembers.includes(user.id))
    .map(course => {
      const coach = usersMap.get(course.coachId)
      return {
        ...course,
        coachName: coach?.name || '未知教练',
        coachAvatar: coach?.avatar || '',
        isBooked: true
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())

  res.json(bookings)
})

app.get('/api/coach/schedule', authMiddleware(['coach']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const { date } = req.query

  let courses = Array.from(coursesMap.values()).filter(c => c.coachId === user.id)

  if (date) {
    const targetDate = dayjs(date as string).format('YYYY-MM-DD')
    courses = courses.filter(c => dayjs(c.startTime).format('YYYY-MM-DD') === targetDate)
  }

  const coursesWithMembers = courses.map(course => {
    const members = course.bookedMembers.map(memberId => {
      const member = usersMap.get(memberId)
      return member
        ? { id: member.id, name: member.name, avatar: member.avatar }
        : null
    }).filter(Boolean)

    return {
      ...course,
      members
    }
  })

  coursesWithMembers.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())

  res.json(coursesWithMembers)
})

app.patch('/api/coach/schedule/:id', authMiddleware(['coach']), (req: Request, res: Response) => {
  const user = (req as any).user as User
  const { id } = req.params
  const { status, cancelReason } = req.body

  const course = coursesMap.get(id)
  if (!course) {
    return res.status(404).json({ message: '课程不存在' })
  }

  if (course.coachId !== user.id) {
    return res.status(403).json({ message: '无权修改该课程' })
  }

  if (status === 'cancelled') {
    course.status = 'cancelled'
    course.cancelReason = cancelReason || '教练临时取消'
  } else if (status === 'normal') {
    course.status = 'normal'
    course.cancelReason = undefined
  }

  const members = course.bookedMembers.map(memberId => {
    const member = usersMap.get(memberId)
    return member
      ? { id: member.id, name: member.name, avatar: member.avatar }
      : null
  }).filter(Boolean)

  res.json({
    ...course,
    members
  })
})

app.get('/api/admin/courses', authMiddleware(['admin']), (_req: Request, res: Response) => {
  const courses = Array.from(coursesMap.values())
    .map(course => {
      const coach = usersMap.get(course.coachId)
      return {
        ...course,
        coachName: coach?.name || '未知教练',
        coachAvatar: coach?.avatar || ''
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())

  res.json(courses)
})

app.post('/api/admin/courses', authMiddleware(['admin']), (req: Request, res: Response) => {
  const { name, startTime, endTime, coachId, maxCapacity } = req.body

  const coach = usersMap.get(coachId)
  if (!coach || coach.role !== 'coach') {
    return res.status(400).json({ message: '无效的教练ID' })
  }

  const course: Course = {
    id: uuidv4(),
    name,
    startTime,
    endTime,
    coachId,
    maxCapacity,
    currentCapacity: 0,
    status: 'normal',
    bookedMembers: []
  }

  coursesMap.set(course.id, course)

  res.status(201).json({
    ...course,
    coachName: coach.name,
    coachAvatar: coach.avatar
  })
})

app.put('/api/admin/courses/:id', authMiddleware(['admin']), (req: Request, res: Response) => {
  const { id } = req.params
  const { name, startTime, endTime, coachId, maxCapacity } = req.body

  const course = coursesMap.get(id)
  if (!course) {
    return res.status(404).json({ message: '课程不存在' })
  }

  const coach = usersMap.get(coachId)
  if (coachId && (!coach || coach.role !== 'coach')) {
    return res.status(400).json({ message: '无效的教练ID' })
  }

  if (name !== undefined) course.name = name
  if (startTime !== undefined) course.startTime = startTime
  if (endTime !== undefined) course.endTime = endTime
  if (coachId !== undefined) course.coachId = coachId
  if (maxCapacity !== undefined) {
    course.maxCapacity = maxCapacity
    if (course.currentCapacity > maxCapacity) {
      course.currentCapacity = maxCapacity
      course.bookedMembers = course.bookedMembers.slice(0, maxCapacity)
    }
  }

  const coachInfo = usersMap.get(course.coachId)
  res.json({
    ...course,
    coachName: coachInfo?.name || '未知教练',
    coachAvatar: coachInfo?.avatar || ''
  })
})

app.delete('/api/admin/courses/:id', authMiddleware(['admin']), (req: Request, res: Response) => {
  const { id } = req.params

  if (!coursesMap.has(id)) {
    return res.status(404).json({ message: '课程不存在' })
  }

  coursesMap.delete(id)
  res.json({ message: '删除成功' })
})

app.get('/api/admin/users', authMiddleware(['admin']), (_req: Request, res: Response) => {
  const users = Array.from(usersMap.values()).map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    disabled: u.disabled
  }))

  res.json(users)
})

app.patch('/api/admin/users/:id/toggle', authMiddleware(['admin']), (req: Request, res: Response) => {
  const { id } = req.params

  const user = usersMap.get(id)
  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }

  user.disabled = !user.disabled

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    disabled: user.disabled
  })
})

app.get('/api/admin/coaches', authMiddleware(['admin']), (_req: Request, res: Response) => {
  const coaches = Array.from(usersMap.values())
    .filter(u => u.role === 'coach')
    .map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar
    }))

  res.json(coaches)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
