import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { Task } from './types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let tasks: Task[] = [
  {
    id: uuidv4(),
    title: '完成项目报告',
    estimatedMinutes: 90,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    urgency: 'high',
    energy: 'high'
  },
  {
    id: uuidv4(),
    title: '回复客户邮件',
    estimatedMinutes: 30,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    urgency: 'medium',
    energy: 'low'
  },
  {
    id: uuidv4(),
    title: '代码审查',
    estimatedMinutes: 60,
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    urgency: 'medium',
    energy: 'medium'
  },
  {
    id: uuidv4(),
    title: '整理会议纪要',
    estimatedMinutes: 20,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    urgency: 'low',
    energy: 'low'
  },
  {
    id: uuidv4(),
    title: '产品原型设计',
    estimatedMinutes: 120,
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    urgency: 'high',
    energy: 'high'
  }
]

app.get('/api/tasks', (_req, res) => {
  res.json(tasks)
})

app.post('/api/tasks', (req, res) => {
  const body = req.body as Task | Task[]
  if (Array.isArray(body)) {
    tasks = body.map(t => ({ ...t, id: t.id || uuidv4() }))
  } else {
    const newTask: Task = { ...body, id: body.id || uuidv4() }
    const existingIndex = tasks.findIndex(t => t.id === newTask.id)
    if (existingIndex >= 0) {
      tasks[existingIndex] = newTask
    } else {
      tasks.push(newTask)
    }
  }
  res.json(tasks)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
