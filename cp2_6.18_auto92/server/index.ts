import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3010

app.use(cors())
app.use(express.json())

interface Project {
  id: string
  name: string
  members: string[]
}

interface Member {
  id: string
  name: string
}

interface TimeRecord {
  id: string
  projectId: string
  memberId: string
  date: string
  hours: number
}

const members: Member[] = [
  { id: 'm1', name: '张伟' },
  { id: 'm2', name: '李娜' },
  { id: 'm3', name: '王强' },
  { id: 'm4', name: '刘芳' },
  { id: 'm5', name: '陈明' },
  { id: 'm6', name: '杨洋' },
  { id: 'm7', name: '赵磊' },
  { id: 'm8', name: '周婷' },
]

const projects: Project[] = [
  { id: 'p1', name: '电商平台重构', members: ['m1', 'm2', 'm3', 'm4', 'm5'] },
  { id: 'p2', name: '移动App开发', members: ['m3', 'm6', 'm7'] },
  { id: 'p3', name: '数据分析系统', members: ['m1', 'm4', 'm8'] },
  { id: 'p4', name: '客户管理系统', members: ['m2', 'm5', 'm6', 'm8'] },
]

const timeRecords: TimeRecord[] = []

const seedData = () => {
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    projects.forEach((project) => {
      project.members.forEach((memberId) => {
        if (Math.random() > 0.3) {
          const dayOfWeek = date.getDay()
          let hours = Math.floor(Math.random() * 9) + 1
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            if (Math.random() > 0.7) {
              hours = Math.floor(Math.random() * 5) + 1
            } else {
              return
            }
          }
          if (Math.random() > 0.95) {
            hours = Math.floor(Math.random() * 6) + 12
          }
          timeRecords.push({
            id: uuidv4(),
            projectId: project.id,
            memberId,
            date: dateStr,
            hours: Math.min(hours, 16),
          })
        }
      })
    })
  }
}

seedData()

app.get('/api/projects', (req, res) => {
  res.json(projects)
})

app.get('/api/members', (req, res) => {
  const projectId = req.query.projectId as string
  if (projectId) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    const projectMembers = members.filter((m) => project.members.includes(m.id))
    return res.json(projectMembers)
  }
  res.json(members)
})

app.get('/api/records', (req, res) => {
  const memberId = req.query.memberId as string
  const projectId = req.query.projectId as string
  const dateRange = req.query.dateRange as string

  let filtered = [...timeRecords]

  if (memberId) {
    filtered = filtered.filter((r) => r.memberId === memberId)
  }

  if (projectId) {
    filtered = filtered.filter((r) => r.projectId === projectId)
  }

  if (dateRange) {
    const [startDate, endDate] = dateRange.split(',')
    if (startDate) {
      filtered = filtered.filter((r) => r.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.date <= endDate)
    }
  }

  res.json(filtered)
})

app.post('/api/records', (req, res) => {
  const { projectId, memberId, date, hours } = req.body

  if (!projectId || !memberId || !date || hours === undefined) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (hours < 0 || hours > 24) {
    return res.status(400).json({ error: 'Hours must be between 0 and 24' })
  }

  const existingIndex = timeRecords.findIndex(
    (r) => r.projectId === projectId && r.memberId === memberId && r.date === date
  )

  if (existingIndex >= 0) {
    timeRecords[existingIndex].hours = hours
    return res.json(timeRecords[existingIndex])
  }

  const newRecord: TimeRecord = {
    id: uuidv4(),
    projectId,
    memberId,
    date,
    hours,
  }
  timeRecords.push(newRecord)
  res.status(201).json(newRecord)
})

app.get('/api/members/:id/detail', (req, res) => {
  const memberId = req.params.id
  const member = members.find((m) => m.id === memberId)

  if (!member) {
    return res.status(404).json({ error: 'Member not found' })
  }

  const memberRecords = timeRecords.filter((r) => r.memberId === memberId)

  const today = new Date()
  const recordsByDate: Record<string, number> = {}
  const last30Days: string[] = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    last30Days.push(dateStr)
    recordsByDate[dateStr] = 0
  }

  memberRecords.forEach((record) => {
    if (recordsByDate[record.date] !== undefined) {
      recordsByDate[record.date] += record.hours
    }
  })

  const abnormalRecords: Array<{
    date: string
    hours: number
    reason: string
  }> = []

  last30Days.forEach((date) => {
    const hours = recordsByDate[date]
    const dayOfWeek = new Date(date).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (hours > 12) {
      abnormalRecords.push({
        date,
        hours,
        reason: hours > 12 ? '单日工时超过12小时' : '',
      })
    } else if (isWeekend && hours > 0) {
      abnormalRecords.push({
        date,
        hours,
        reason: '周末加班',
      })
    }
  })

  const weeklyHours: number[] = []
  for (let week = 0; week < 4; week++) {
    let total = 0
    for (let day = 0; day < 7; day++) {
      const index = week * 7 + day
      if (index < last30Days.length) {
        total += recordsByDate[last30Days[last30Days.length - 1 - index]] || 0
      }
    }
    weeklyHours.unshift(total)
  }

  res.json({
    member,
    dailyRecords: last30Days.map((date) => ({
      date,
      hours: recordsByDate[date] || 0,
    })),
    abnormalRecords: abnormalRecords.sort((a, b) => b.date.localeCompare(a.date)),
    weeklyHours,
    projects: projects.filter((p) => p.members.includes(memberId)),
  })
})

app.get('/api/dashboard', (req, res) => {
  const today = new Date()
  const last7Days: string[] = []
  const last14Days: string[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    last7Days.push(date.toISOString().split('T')[0])
  }

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    last14Days.push(date.toISOString().split('T')[0])
  }

  const last7DaysRecords = timeRecords.filter((r) => last7Days.includes(r.date))
  const prev7DaysRecords = timeRecords.filter(
    (r) => !last7Days.includes(r.date) && last14Days.includes(r.date)
  )

  const last7DaysTotal = last7DaysRecords.reduce((sum, r) => sum + r.hours, 0)
  const prev7DaysTotal = prev7DaysRecords.reduce((sum, r) => sum + r.hours, 0)

  const weekChange =
    prev7DaysTotal > 0
      ? ((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100
      : 0

  const memberWeeklyHours: Record<string, number> = {}
  members.forEach((m) => {
    memberWeeklyHours[m.id] = 0
  })
  last7DaysRecords.forEach((r) => {
    memberWeeklyHours[r.memberId] = (memberWeeklyHours[r.memberId] || 0) + r.hours
  })

  const topMembers = members
    .map((m) => ({
      member: m,
      hours: memberWeeklyHours[m.id] || 0,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)

  const last30Days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    last30Days.push(date.toISOString().split('T')[0])
  }

  const dailyTotals = last30Days.map((date) => {
    const dayRecords = timeRecords.filter((r) => r.date === date)
    return {
      date,
      total: dayRecords.reduce((sum, r) => sum + r.hours, 0),
    }
  })

  const projectChange =
    projects.length > 3 ? 8 : projects.length > 1 ? 15 : -5
  const memberChange =
    members.length > 5 ? 12 : members.length > 2 ? 6 : -3

  res.json({
    stats: {
      totalProjects: projects.length,
      totalMembers: members.length,
      last7DaysHours: Math.round(last7DaysTotal * 10) / 10,
      projectChange: projectChange,
      memberChange: memberChange,
      weekChange: Math.round(weekChange * 10) / 10,
    },
    topMembers,
    dailyTrend: dailyTotals,
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
