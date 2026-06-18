import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { Poll, PollOption, VoteRecord, TimelinePoint, CreatePollRequest, VoteRequest } from '../shared/types.js'

dotenv.config()

const app: express.Application = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const polls = new Map<string, Poll>()
const voteRecords = new Map<string, VoteRecord[]>()
const timeline = new Map<string, TimelinePoint[]>()

function getPoll(id: string): Poll | undefined {
  return polls.get(id)
}

function sanitizePoll(poll: Poll): Omit<Poll, 'voterIPs'> & { voterIPs?: string[] } {
  const { voterIPs, ...rest } = poll
  return { ...rest }
}

app.post('/api/poll', (req: Request, res: Response): void => {
  const { title, options, deadline } = req.body as CreatePollRequest

  if (!title || title.trim().length === 0 || title.length > 50) {
    res.status(400).json({ error: '标题不能为空且不超过50字' })
    return
  }

  if (!options || options.length < 2) {
    res.status(400).json({ error: '至少需要2个选项' })
    return
  }

  for (const opt of options) {
    if (!opt || opt.trim().length === 0 || opt.length > 30) {
      res.status(400).json({ error: '选项不能为空且不超过30字' })
      return
    }
  }

  const pollId = uuidv4()
  const pollOptions: PollOption[] = options.map((text: string) => ({
    id: uuidv4(),
    text: text.trim(),
    votes: 0,
  }))

  const poll: Poll = {
    id: pollId,
    title: title.trim(),
    options: pollOptions,
    createdAt: new Date().toISOString(),
    deadline: deadline || null,
    isClosed: false,
    voterIPs: [],
  }

  polls.set(pollId, poll)
  voteRecords.set(pollId, [])
  timeline.set(pollId, [])

  res.status(201).json(sanitizePoll(poll))
})

app.get('/api/polls', (_req: Request, res: Response): void => {
  const allPolls = Array.from(polls.values()).map(sanitizePoll)
  res.json(allPolls)
})

app.get('/api/poll/:id', (req: Request, res: Response): void => {
  const poll = getPoll(req.params.id)
  if (!poll) {
    res.status(404).json({ error: '投票不存在' })
    return
  }
  res.json(sanitizePoll(poll))
})

app.post('/api/poll/:id/vote', (req: Request, res: Response): void => {
  const pollId = req.params.id
  const poll = getPoll(pollId)
  if (!poll) {
    res.status(404).json({ error: '投票不存在' })
    return
  }

  if (poll.isClosed) {
    res.status(403).json({ error: '投票已结束' })
    return
  }

  if (poll.deadline && new Date(poll.deadline) < new Date()) {
    poll.isClosed = true
    res.status(403).json({ error: '投票已结束' })
    return
  }

  const voterIP = req.ip || req.socket.remoteAddress || 'unknown'
  if (poll.voterIPs.includes(voterIP)) {
    res.status(403).json({ error: '您已投过票' })
    return
  }

  const { optionIds } = req.body as VoteRequest
  if (!optionIds || optionIds.length === 0) {
    res.status(400).json({ error: '请选择至少一个选项' })
    return
  }

  for (const optId of optionIds) {
    const option = poll.options.find((o) => o.id === optId)
    if (!option) {
      res.status(400).json({ error: '无效的选项' })
      return
    }
  }

  const now = new Date().toISOString()
  const records = voteRecords.get(pollId) || []
  const tlPoints = timeline.get(pollId) || []

  for (const optId of optionIds) {
    const option = poll.options.find((o) => o.id === optId)!
    option.votes++
    poll.voterIPs.push(voterIP)

    const record: VoteRecord = {
      pollId,
      optionId: optId,
      voterIP,
      timestamp: now,
    }
    records.push(record)

    const totalAtTime = poll.options.reduce((sum, o) => sum + o.votes, 0)
    tlPoints.push({
      timestamp: now,
      optionId: optId,
      optionText: option.text,
      cumulativeVotes: option.votes,
      totalVotesAtTime: totalAtTime,
    })
  }

  voteRecords.set(pollId, records)
  timeline.set(pollId, tlPoints)

  const publicPoll = sanitizePoll(poll)
  io.to(pollId).emit('result', publicPoll)

  res.json(publicPoll)
})

app.patch('/api/poll/:id/close', (req: Request, res: Response): void => {
  const poll = getPoll(req.params.id)
  if (!poll) {
    res.status(404).json({ error: '投票不存在' })
    return
  }
  poll.isClosed = true
  const publicPoll = sanitizePoll(poll)
  io.to(poll.id).emit('result', publicPoll)
  res.json(publicPoll)
})

app.get('/api/poll/:id/timeline', (req: Request, res: Response): void => {
  const pollId = req.params.id
  const poll = getPoll(pollId)
  if (!poll) {
    res.status(404).json({ error: '投票不存在' })
    return
  }
  const points = timeline.get(pollId) || []
  res.json(points)
})

app.get('/api/poll/:id/export', (req: Request, res: Response): void => {
  const poll = getPoll(req.params.id)
  if (!poll) {
    res.status(404).json({ error: '投票不存在' })
    return
  }
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
  const header = '排名,选项,得票数,得票率'
  const sorted = [...poll.options].sort((a, b) => b.votes - a.votes)
  const rows = sorted.map((opt, idx) => {
    const pct = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0.0'
    return `${idx + 1},${opt.text},${opt.votes},${pct}%`
  })
  const csv = [header, ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=poll-${poll.id}.csv`)
  res.send('\uFEFF' + csv)
})

app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'API not found' })
})

io.on('connection', (socket) => {
  socket.on('join', (pollId: string) => {
    socket.join(pollId)
  })
  socket.on('leave', (pollId: string) => {
    socket.leave(pollId)
  })
})

export { app, server, io }
