import express, {
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Project {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
  projectId: string
}

interface TimeRecord {
  id: string
  memberId: string
  projectId: string
  date: string
  hours: number
}

const projects: Project[] = [
  { id: 'p1', name: 'Alpha项目' },
  { id: 'p2', name: 'Beta项目' },
  { id: 'p3', name: 'Gamma项目' },
]

const members: Member[] = [
  { id: 'm1', name: '张伟', projectId: 'p1' },
  { id: 'm2', name: '李娜', projectId: 'p1' },
  { id: 'm3', name: '王强', projectId: 'p1' },
  { id: 'm4', name: '赵敏', projectId: 'p1' },
  { id: 'm5', name: '刘洋', projectId: 'p2' },
  { id: 'm6', name: '陈静', projectId: 'p2' },
  { id: 'm7', name: '杨帆', projectId: 'p2' },
  { id: 'm8', name: '黄磊', projectId: 'p3' },
  { id: 'm9', name: '周琳', projectId: 'p3' },
  { id: 'm10', name: '吴昊', projectId: 'p3' },
  { id: 'm11', name: '孙涛', projectId: 'p3' },
]

function generateSeedData(): TimeRecord[] {
  const records: TimeRecord[] = []
  const today = new Date()
  const allMembers = [...members]

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    for (const member of allMembers) {
      if (Math.random() < 0.1) continue

      let hours: number
      const rand = Math.random()

      if (rand < 0.05) {
        hours = 13 + Math.floor(Math.random() * 4)
      } else if (rand < 0.15) {
        hours = 9 + Math.random() * 3
      } else if (isWeekend && rand < 0.12) {
        hours = 4 + Math.random() * 5
      } else if (isWeekend) {
        continue
      } else {
        hours = 4 + Math.random() * 5
      }

      hours = Math.round(hours * 2) / 2

      records.push({
        id: uuidv4(),
        memberId: member.id,
        projectId: member.projectId,
        date: dateStr,
        hours,
      })
    }
  }

  return records
}

const timeRecords: TimeRecord[] = generateSeedData()

function getLast7DaysRange(): { start: string; end: string } {
  const today = new Date()
  const end = today.toISOString().split('T')[0]
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  return { start: start.toISOString().split('T')[0], end }
}

function getPrev7DaysRange(): { start: string; end: string } {
  const today = new Date()
  const prevEnd = new Date(today)
  prevEnd.setDate(prevEnd.getDate() - 7)
  const prevStart = new Date(today)
  prevStart.setDate(prevStart.getDate() - 13)
  return { start: prevStart.toISOString().split('T')[0], end: prevEnd.toISOString().split('T')[0] }
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  const day = d.getDay()
  return day === 0 || day === 6
}

app.get('/api/projects', (_req: Request, res: Response) => {
  res.json(projects)
})

app.get('/api/members', (req: Request, res: Response) => {
  const { projectId } = req.query
  let result = [...members]
  if (projectId) {
    result = result.filter((m) => m.projectId === projectId)
  }
  res.json(result)
})

app.get('/api/records', (req: Request, res: Response) => {
  const { memberId, dateRange } = req.query
  let result = [...timeRecords]
  if (memberId) {
    result = result.filter((r) => r.memberId === memberId)
  }
  if (dateRange === '30d') {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    const startStr = start.toISOString().split('T')[0]
    result = result.filter((r) => r.date >= startStr)
  }
  res.json(result)
})

app.post('/api/records', (req: Request, res: Response) => {
  const { memberId, projectId, date, hours } = req.body
  if (!memberId || !projectId || !date || hours === undefined) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  if (hours < 0 || hours > 24) {
    res.status(400).json({ error: 'Hours must be between 0 and 24' })
    return
  }

  const existing = timeRecords.findIndex(
    (r) => r.memberId === memberId && r.date === date
  )
  if (existing >= 0) {
    timeRecords[existing].hours = hours
    timeRecords[existing].projectId = projectId
    res.json(timeRecords[existing])
    return
  }

  const record: TimeRecord = {
    id: uuidv4(),
    memberId,
    projectId,
    date,
    hours,
  }
  timeRecords.push(record)
  res.json(record)
})

app.get('/api/members/:id/detail', (req: Request, res: Response) => {
  const { id } = req.params
  const member = members.find((m) => m.id === id)
  if (!member) {
    res.status(404).json({ error: 'Member not found' })
    return
  }

  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 29)
  const startStr = start.toISOString().split('T')[0]

  const memberRecords = timeRecords
    .filter((r) => r.memberId === id && r.date >= startStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const anomalies: { date: string; hours: number; reason: string }[] = []
  for (const rec of memberRecords) {
    if (rec.hours > 12) {
      anomalies.push({ date: rec.date, hours: rec.hours, reason: '单日工时超过12小时' })
    }
    if (isWeekend(rec.date) && rec.hours > 0) {
      anomalies.push({ date: rec.date, hours: rec.hours, reason: '周末加班' })
    }
  }

  res.json({ member, records: memberRecords, anomalies })
})

app.get('/api/dashboard/summary', (_req: Request, res: Response) => {
  const last7 = getLast7DaysRange()
  const prev7 = getPrev7DaysRange()

  const last7Hours = timeRecords
    .filter((r) => r.date >= last7.start && r.date <= last7.end)
    .reduce((sum, r) => sum + r.hours, 0)

  const prev7Hours = timeRecords
    .filter((r) => r.date >= prev7.start && r.date <= prev7.end)
    .reduce((sum, r) => sum + r.hours, 0)

  const last7ActiveMembers = new Set(
    timeRecords
      .filter((r) => r.date >= last7.start && r.date <= last7.end)
      .map((r) => r.memberId)
  ).size

  const prev7ActiveMembers = new Set(
    timeRecords
      .filter((r) => r.date >= prev7.start && r.date <= prev7.end)
      .map((r) => r.memberId)
  ).size

  res.json({
    totalProjects: projects.length,
    totalMembers: members.length,
    last7DaysHours: Math.round(last7Hours * 10) / 10,
    projectChange: 0,
    memberChange: calcChange(last7ActiveMembers, prev7ActiveMembers),
    hoursChange: calcChange(last7Hours, prev7Hours),
  })
})

app.get('/api/dashboard/rankings', (_req: Request, res: Response) => {
  const { start } = getLast7DaysRange()
  const { end } = getLast7DaysRange()

  const weekRecords = timeRecords.filter(
    (r) => r.date >= start && r.date <= end
  )

  const memberHours: Record<string, number> = {}
  for (const r of weekRecords) {
    memberHours[r.memberId] = (memberHours[r.memberId] || 0) + r.hours
  }

  const rankings = Object.entries(memberHours)
    .map(([memberId, weekHours]) => {
      const member = members.find((m) => m.id === memberId)
      return {
        memberId,
        memberName: member?.name || 'Unknown',
        weekHours: Math.round(weekHours * 10) / 10,
      }
    })
    .sort((a, b) => b.weekHours - a.weekHours)
    .slice(0, 5)

  res.json(rankings)
})

app.get('/api/dashboard/trend', (_req: Request, res: Response) => {
  const today = new Date()
  const trend: { date: string; totalHours: number }[] = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const totalHours = timeRecords
      .filter((r) => r.date === dateStr)
      .reduce((sum, r) => sum + r.hours, 0)
    trend.push({ date: dateStr, totalHours: Math.round(totalHours * 10) / 10 })
  }

  res.json(trend)
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'API not found' })
})

export default app
