import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {
  registerUser,
  loginUser,
  getUserById,
  getPetsByOwner,
  addPet,
  updatePet,
  deletePet,
  getAllTasks,
  getHotTasks,
  createTask,
  assignTask,
  completeTask,
  addEvaluation,
  getEvaluationsByCaregiver,
  getTopCaregivers,
  getCaregiverStats,
  getCaregiverDetail,
  getTaskById,
  getEvaluationByTask,
} from './db.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.post('/api/users/register', (req: Request, res: Response): void => {
  const { name, password, role } = req.body
  if (!name || !password || !role) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }
  if (!['owner', 'caregiver'].includes(role)) {
    res.status(400).json({ success: false, error: '角色类型无效' })
    return
  }
  const user = registerUser(name, password, role)
  if (!user) {
    res.status(409).json({ success: false, error: '用户名已存在' })
    return
  }
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, role: user.role } })
})

app.post('/api/users/login', (req: Request, res: Response): void => {
  const { name, password } = req.body
  if (!name || !password) {
    res.status(400).json({ success: false, error: '缺少用户名或密码' })
    return
  }
  const user = loginUser(name, password)
  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }
  res.json({ success: true, data: { id: user.id, name: user.name, role: user.role } })
})

app.get('/api/users/:id', (req: Request, res: Response): void => {
  const user = getUserById(req.params.id)
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  res.json({ success: true, data: { id: user.id, name: user.name, role: user.role } })
})

app.get('/api/pets', (req: Request, res: Response): void => {
  const ownerId = req.query.ownerId as string
  if (!ownerId) {
    res.status(400).json({ success: false, error: '缺少ownerId参数' })
    return
  }
  const pets = getPetsByOwner(ownerId)
  res.json({ success: true, data: pets })
})

app.post('/api/pets', (req: Request, res: Response): void => {
  const { name, breed, age, personality, vaccine, ownerId } = req.body
  if (!name || !breed || age === undefined || !personality || !vaccine || !ownerId) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }
  const pet = addPet({ name, breed, age, personality, vaccine, ownerId })
  res.status(201).json({ success: true, data: pet })
})

app.put('/api/pets/:id', (req: Request, res: Response): void => {
  const pet = updatePet(req.params.id, req.body)
  if (!pet) {
    res.status(404).json({ success: false, error: '宠物不存在' })
    return
  }
  res.json({ success: true, data: pet })
})

app.delete('/api/pets/:id', (req: Request, res: Response): void => {
  const success = deletePet(req.params.id)
  if (!success) {
    res.status(404).json({ success: false, error: '宠物不存在' })
    return
  }
  res.json({ success: true })
})

app.get('/api/tasks', (_req: Request, res: Response): void => {
  const tasks = getAllTasks()
  res.json({ success: true, data: tasks })
})

app.get('/api/tasks/hot', (_req: Request, res: Response): void => {
  const tasks = getHotTasks()
  res.json({ success: true, data: tasks })
})

app.get('/api/tasks/:id', (req: Request, res: Response): void => {
  const task = getTaskById(req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务不存在' })
    return
  }
  res.json({ success: true, data: task })
})

app.post('/api/tasks', (req: Request, res: Response): void => {
  const { petId, startTime, endTime, location, duration, reward, ownerId } = req.body
  if (!petId || !startTime || !endTime || !location || !duration || !reward || !ownerId) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }
  const task = createTask({ petId, startTime, endTime, location, duration, reward, status: 'pending', ownerId, caregiverId: null })
  res.status(201).json({ success: true, data: task })
})

app.post('/api/tasks/:id/assign', (req: Request, res: Response): void => {
  const { caregiverId } = req.body
  if (!caregiverId) {
    res.status(400).json({ success: false, error: '缺少caregiverId' })
    return
  }
  const task = assignTask(req.params.id, caregiverId)
  if (!task) {
    res.status(400).json({ success: false, error: '任务不存在或已被接单' })
    return
  }
  res.json({ success: true, data: task })
})

app.post('/api/tasks/:id/complete', (req: Request, res: Response): void => {
  const task = completeTask(req.params.id)
  if (!task) {
    res.status(400).json({ success: false, error: '任务不存在或状态不允许完成' })
    return
  }
  res.json({ success: true, data: task })
})

app.post('/api/evaluations', (req: Request, res: Response): void => {
  const { taskId, caregiverId, ownerId, rating, comment } = req.body
  if (!taskId || !caregiverId || !ownerId || !rating || !comment) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: '评分必须在1-5之间' })
    return
  }
  const existing = getEvaluationByTask(taskId)
  if (existing) {
    res.status(409).json({ success: false, error: '该任务已评价' })
    return
  }
  const evaluation = addEvaluation({ taskId, caregiverId, ownerId, rating, comment, createdAt: new Date().toISOString() })
  res.status(201).json({ success: true, data: evaluation })
})

app.get('/api/evaluations', (req: Request, res: Response): void => {
  const caregiverId = req.query.caregiverId as string
  if (!caregiverId) {
    res.status(400).json({ success: false, error: '缺少caregiverId参数' })
    return
  }
  const evaluations = getEvaluationsByCaregiver(caregiverId)
  res.json({ success: true, data: evaluations })
})

app.get('/api/caregivers/top', (_req: Request, res: Response): void => {
  const caregivers = getTopCaregivers(5)
  res.json({ success: true, data: caregivers })
})

app.get('/api/caregivers/:id/stats', (req: Request, res: Response): void => {
  const stats = getCaregiverStats(req.params.id)
  if (!stats) {
    res.status(404).json({ success: false, error: '看护者不存在' })
    return
  }
  res.json({ success: true, data: stats })
})

app.get('/api/caregivers/:id', (req: Request, res: Response): void => {
  const detail = getCaregiverDetail(req.params.id)
  if (!detail) {
    res.status(404).json({ success: false, error: '看护者不存在' })
    return
  }
  res.json({ success: true, data: detail })
})

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
