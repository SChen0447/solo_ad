import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Course {
  id: string
  title: string
  type: string
  date: string
  time: string
  maxStudents: number
  enrolledStudents: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  materials: string[]
  description: string
  colorIndex: number
}

interface FeedbackItem {
  id: string
  courseId: string
  userId: string
  rating: number
  comment: string
  createdAt: string
}

const COURSE_COLORS = ['#D2691E', '#6B8E23', '#8B4513', '#CD853F', '#B8860B', '#556B2F']

const courses: Course[] = [
  {
    id: '1',
    title: '手拉坯陶艺入门',
    type: '陶艺',
    date: '2026-07-05',
    time: '09:00-12:00',
    maxStudents: 12,
    enrolledStudents: ['user-1', 'user-2', 'user-3'],
    difficulty: 'beginner',
    materials: ['陶土2kg', '拉坯机', '修坯刀具套装', '围裙', '海绵'],
    description: '从零开始学习手拉坯技艺，感受泥土在指尖旋转成型的奇妙过程。课程涵盖揉泥、定中心、拉坯和修坯等基础技法。',
    colorIndex: 0,
  },
  {
    id: '2',
    title: '手工编织围巾',
    type: '编织',
    date: '2026-07-08',
    time: '14:00-17:00',
    maxStudents: 10,
    enrolledStudents: ['user-1'],
    difficulty: 'beginner',
    materials: ['粗毛线3团', '编织针8mm', '缝针', '剪刀', '图案教程'],
    description: '用柔软的毛线编织一条温暖的围巾，学习起针、平针和收针等基础编织技法，适合零基础学员。',
    colorIndex: 1,
  },
  {
    id: '3',
    title: '传统扎染艺术',
    type: '扎染',
    date: '2026-07-12',
    time: '10:00-13:00',
    maxStudents: 8,
    enrolledStudents: ['user-1', 'user-2', 'user-4', 'user-5', 'user-6', 'user-7'],
    difficulty: 'intermediate',
    materials: ['纯棉方巾2条', '植物染料套装', '橡皮筋', '线绳', '固色剂', '手套'],
    description: '体验千年扎染工艺，学习折叠、绑扎和浸染技法，创作属于自己的蓝白花纹艺术品。',
    colorIndex: 2,
  },
  {
    id: '4',
    title: '木工小家具制作',
    type: '木工',
    date: '2026-07-15',
    time: '09:00-16:00',
    maxStudents: 6,
    enrolledStudents: ['user-2', 'user-3'],
    difficulty: 'advanced',
    materials: ['松木板', '木工胶', '砂纸套装', '刷子', '木蜡油', '安全护目镜'],
    description: '从选材到成品，亲手打造一件实用小木凳。课程涉及量尺、切割、打磨和组装等全套木工技法。',
    colorIndex: 3,
  },
  {
    id: '5',
    title: '手工皮具卡包',
    type: '皮具',
    date: '2026-07-18',
    time: '13:00-16:00',
    maxStudents: 10,
    enrolledStudents: ['user-4', 'user-5'],
    difficulty: 'intermediate',
    materials: ['植鞣革A4大小', '菱斩', '缝线', '针', '边油', '打磨棒'],
    description: '制作一个精致的手缝皮具卡包，学习裁皮、打孔、手缝和边缘处理等皮艺核心技术。',
    colorIndex: 4,
  },
  {
    id: '6',
    title: '日式花艺入门',
    type: '花艺',
    date: '2026-07-20',
    time: '10:00-12:00',
    maxStudents: 15,
    enrolledStudents: [],
    difficulty: 'beginner',
    materials: ['花材套装', '花器', '剑山', '花剪', '铁丝', '绿胶带'],
    description: '学习日式花道基本构图与插花技法，在宁静的氛围中感受自然之美，创作一件小型花艺作品。',
    colorIndex: 5,
  },
]

const feedbacks: FeedbackItem[] = [
  {
    id: 'fb-1',
    courseId: '1',
    userId: 'user-2',
    rating: 5,
    comment: '老师非常耐心，拉坯体验太棒了！从完全不会到做出第一个碗，成就感满满。',
    createdAt: '2026-06-18T10:30:00Z',
  },
  {
    id: 'fb-2',
    courseId: '1',
    userId: 'user-3',
    rating: 4,
    comment: '课程内容很丰富，就是时间有点紧，希望能再长一些。陶土手感很疗愈。',
    createdAt: '2026-06-18T11:00:00Z',
  },
  {
    id: 'fb-3',
    courseId: '3',
    userId: 'user-2',
    rating: 5,
    comment: '扎染的效果超出预期！植物染料的颜色特别好看，学到了很多新技巧。',
    createdAt: '2026-06-15T14:20:00Z',
  },
]

const ACHIEVEMENTS = [
  { id: 'ach-1', name: '新手手工艺人', description: '完成3门手工艺课程', condition: 3 },
  { id: 'ach-2', name: '熟手工匠', description: '完成5门手工艺课程', condition: 5 },
]

app.get('/api/courses', (_req: Request, res: Response) => {
  res.json(courses)
})

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const course = courses.find((c) => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ success: false, error: '课程未找到' })
    return
  }
  res.json(course)
})

app.post('/api/courses/:id/signup', (req: Request, res: Response) => {
  const course = courses.find((c) => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ success: false, error: '课程未找到' })
    return
  }
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ success: false, error: '缺少用户ID' })
    return
  }
  if (course.enrolledStudents.includes(userId)) {
    res.status(400).json({ success: false, error: '已报名该课程' })
    return
  }
  if (course.enrolledStudents.length >= course.maxStudents) {
    res.status(400).json({ success: false, error: '课程名额已满' })
    return
  }
  course.enrolledStudents.push(userId)
  res.json({ success: true })
})

app.delete('/api/courses/:id/signup', (req: Request, res: Response) => {
  const course = courses.find((c) => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ success: false, error: '课程未找到' })
    return
  }
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ success: false, error: '缺少用户ID' })
    return
  }
  const idx = course.enrolledStudents.indexOf(userId)
  if (idx === -1) {
    res.status(400).json({ success: false, error: '未报名该课程' })
    return
  }
  course.enrolledStudents.splice(idx, 1)
  res.json({ success: true })
})

app.get('/api/courses/:id/feedback', (req: Request, res: Response) => {
  const courseFeedbacks = feedbacks.filter((f) => f.courseId === req.params.id)
  res.json(courseFeedbacks)
})

app.post('/api/courses/:id/feedback', (req: Request, res: Response) => {
  const course = courses.find((c) => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ success: false, error: '课程未找到' })
    return
  }
  const { userId, rating, comment } = req.body
  if (!userId || !rating || !comment) {
    res.status(400).json({ success: false, error: '缺少必要参数' })
    return
  }
  const existing = feedbacks.find((f) => f.courseId === req.params.id && f.userId === userId)
  if (existing) {
    res.status(400).json({ success: false, error: '已提交过反馈' })
    return
  }
  const newFeedback: FeedbackItem = {
    id: `fb-${Date.now()}`,
    courseId: req.params.id,
    userId,
    rating: Number(rating),
    comment: String(comment).slice(0, 150),
    createdAt: new Date().toISOString(),
  }
  feedbacks.unshift(newFeedback)
  res.json({ success: true, feedback: newFeedback })
})

app.get('/api/user/:id/courses', (req: Request, res: Response) => {
  const userId = req.params.id
  const enrolledCourses = courses.filter((c) => c.enrolledStudents.includes(userId))
  res.json(enrolledCourses)
})

app.get('/api/user/:id/achievements', (req: Request, res: Response) => {
  const userId = req.params.id
  const enrolledCount = courses.filter((c) => c.enrolledStudents.includes(userId)).length
  const achievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: enrolledCount >= a.condition,
  }))
  res.json(achievements)
})

app.get('/api/colors', (_req: Request, res: Response) => {
  res.json(COURSE_COLORS)
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
