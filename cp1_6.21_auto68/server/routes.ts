import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()
const DATA_DIR = path.join(__dirname, 'data')
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json')

interface Member {
  id: string
  name: string
  lastReportTime: string | null
  lastCheckpoint: number | null
  distanceFromStart: number
  emergencyContact: string
  supplies: string[]
  isActive: boolean
}

interface Checkpoint {
  id: number
  distance: number
  elevation: number
  estimatedTime: string
}

interface Activity {
  id: string
  code: string
  name: string
  meetingPoint: string
  estimatedDuration: number
  difficulty: 'easy' | 'medium' | 'hard'
  maxMembers: number
  members: Member[]
  checkpoints: Checkpoint[]
  status: 'upcoming' | 'ongoing' | 'finished'
  startTime: string | null
  endTime: string | null
  createdAt: string
}

const generateActivityCode = (): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateCheckpoints = (): Checkpoint[] => {
  return [
    { id: 0, distance: 0, elevation: 100, estimatedTime: '起点' },
    { id: 1, distance: 500, elevation: 180, estimatedTime: '09:30' },
    { id: 2, distance: 1000, elevation: 260, estimatedTime: '10:15' },
    { id: 3, distance: 1500, elevation: 350, estimatedTime: '11:00' },
    { id: 4, distance: 2000, elevation: 420, estimatedTime: '11:45' },
    { id: 5, distance: 2500, elevation: 380, estimatedTime: '12:30' },
    { id: 6, distance: 3000, elevation: 290, estimatedTime: '13:15' }
  ]
}

const readActivities = (): Activity[] => {
  if (!fs.existsSync(ACTIVITIES_FILE)) {
    return []
  }
  const data = fs.readFileSync(ACTIVITIES_FILE, 'utf-8')
  return JSON.parse(data)
}

const writeActivities = (activities: Activity[]) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2))
}

router.post('/activities', (req: Request, res: Response) => {
  const { name, meetingPoint, estimatedDuration, difficulty, maxMembers = 12 } = req.body
  
  if (!name || !meetingPoint || !estimatedDuration || !difficulty) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const activities = readActivities()
  let code = generateActivityCode()
  
  while (activities.some(a => a.code === code)) {
    code = generateActivityCode()
  }

  const newActivity: Activity = {
    id: uuidv4(),
    code,
    name,
    meetingPoint,
    estimatedDuration,
    difficulty,
    maxMembers,
    members: [],
    checkpoints: generateCheckpoints(),
    status: 'upcoming',
    startTime: null,
    endTime: null,
    createdAt: new Date().toISOString()
  }

  activities.push(newActivity)
  writeActivities(activities)

  res.status(201).json({ code, activity: newActivity })
})

router.get('/activities', (_req: Request, res: Response) => {
  const activities = readActivities()
  res.json(activities)
})

router.get('/activities/:code', (req: Request, res: Response) => {
  const { code } = req.params
  const activities = readActivities()
  const activity = activities.find(a => a.code === code.toUpperCase())

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  res.json(activity)
})

router.post('/activities/:code/join', (req: Request, res: Response) => {
  const { code } = req.params
  const { name, emergencyContact = '' } = req.body

  if (!name) {
    return res.status(400).json({ error: '请提供成员姓名' })
  }

  const activities = readActivities()
  const activityIndex = activities.findIndex(a => a.code === code.toUpperCase())

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const activity = activities[activityIndex]

  if (activity.members.length >= activity.maxMembers) {
    return res.status(400).json({ error: '活动人数已满' })
  }

  const newMember: Member = {
    id: uuidv4(),
    name,
    lastReportTime: null,
    lastCheckpoint: null,
    distanceFromStart: 0,
    emergencyContact,
    supplies: [],
    isActive: false
  }

  activity.members.push(newMember)
  activities[activityIndex] = activity
  writeActivities(activities)

  res.status(201).json({ member: newMember, activity })
})

router.patch('/activities/:code/members/:id/location', (req: Request, res: Response) => {
  const { code, id } = req.params
  const { checkpointId } = req.body

  const activities = readActivities()
  const activityIndex = activities.findIndex(a => a.code === code.toUpperCase())

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const activity = activities[activityIndex]
  const memberIndex = activity.members.findIndex(m => m.id === id)

  if (memberIndex === -1) {
    return res.status(404).json({ error: '成员不存在' })
  }

  const checkpoint = activity.checkpoints.find(c => c.id === checkpointId)
  if (!checkpoint) {
    return res.status(400).json({ error: '标记点不存在' })
  }

  const member = activity.members[memberIndex]
  member.lastReportTime = new Date().toISOString()
  member.lastCheckpoint = checkpointId
  member.distanceFromStart = checkpoint.distance
  member.isActive = true

  if (activity.status === 'upcoming') {
    activity.status = 'ongoing'
    activity.startTime = new Date().toISOString()
  }

  activities[activityIndex] = activity
  writeActivities(activities)

  res.json({ member, activity })
})

router.patch('/activities/:code/members/:id/supplies', (req: Request, res: Response) => {
  const { code, id } = req.params
  const { supplies } = req.body

  const activities = readActivities()
  const activityIndex = activities.findIndex(a => a.code === code.toUpperCase())

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const activity = activities[activityIndex]
  const memberIndex = activity.members.findIndex(m => m.id === id)

  if (memberIndex === -1) {
    return res.status(404).json({ error: '成员不存在' })
  }

  activity.members[memberIndex].supplies = supplies || []
  activities[activityIndex] = activity
  writeActivities(activities)

  res.json({ member: activity.members[memberIndex] })
})

router.patch('/activities/:code/members/:id/emergency', (req: Request, res: Response) => {
  const { code, id } = req.params
  const { emergencyContact } = req.body

  const activities = readActivities()
  const activityIndex = activities.findIndex(a => a.code === code.toUpperCase())

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const activity = activities[activityIndex]
  const memberIndex = activity.members.findIndex(m => m.id === id)

  if (memberIndex === -1) {
    return res.status(404).json({ error: '成员不存在' })
  }

  activity.members[memberIndex].emergencyContact = emergencyContact || ''
  activities[activityIndex] = activity
  writeActivities(activities)

  res.json({ member: activity.members[memberIndex] })
})

router.post('/activities/:code/finish', (req: Request, res: Response) => {
  const { code } = req.params

  const activities = readActivities()
  const activityIndex = activities.findIndex(a => a.code === code.toUpperCase())

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const activity = activities[activityIndex]
  activity.status = 'finished'
  activity.endTime = new Date().toISOString()

  activities[activityIndex] = activity
  writeActivities(activities)

  res.json({ activity })
})

router.get('/activities/:code/summary', (req: Request, res: Response) => {
  const { code } = req.params
  const activities = readActivities()
  const activity = activities.find(a => a.code === code.toUpperCase())

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const memberStats = activity.members.map(member => {
    const reportCount = member.lastReportTime ? 1 : 0
    const checkpointsVisited = member.lastCheckpoint !== null ? member.lastCheckpoint + 1 : 0
    
    return {
      memberId: member.id,
      name: member.name,
      reportCount: checkpointsVisited,
      totalCheckpoints: activity.checkpoints.length,
      lastReportTime: member.lastReportTime
    }
  })

  const actualDuration = activity.startTime && activity.endTime
    ? Math.round((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / 60000)
    : activity.estimatedDuration

  const reportedCheckpoints = activity.checkpoints.filter((cp, idx) => 
    activity.members.some(m => m.lastCheckpoint !== null && m.lastCheckpoint >= idx)
  )

  const summary = {
    activity: {
      ...activity,
      actualDuration,
      actualRoute: reportedCheckpoints
    },
    memberStats
  }

  res.json(summary)
})

export default router
