import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface Poll {
  id: string
  title: string
  options: PollOption[]
  createdAt: number
  deadline?: number
  creatorIp: string
}

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json())

const polls = new Map<string, Poll>()
const votedIpsByPoll = new Map<string, Set<string>>()

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for']
  if (Array.isArray(forwarded)) {
    return forwarded[0] || req.ip || 'unknown'
  }
  return (forwarded as string) || req.ip || 'unknown'
}

app.post('/api/polls', (req: Request, res: Response) => {
  const { title, options, deadline } = req.body

  if (!title || !Array.isArray(options) || options.length < 2 || options.length > 10) {
    return res.status(400).json({ error: '无效的投票参数' })
  }

  const id = uuidv4()
  const creatorIp = getClientIp(req)

  const poll: Poll = {
    id,
    title,
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: 0
    })),
    createdAt: Date.now(),
    deadline: deadline ? new Date(deadline).getTime() : undefined,
    creatorIp
  }

  polls.set(id, poll)
  votedIpsByPoll.set(id, new Set())

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    createdAt: poll.createdAt,
    deadline: poll.deadline
  })
})

app.get('/api/polls', (_req: Request, res: Response) => {
  const now = Date.now()
  const pollList = Array.from(polls.values()).map(poll => ({
    id: poll.id,
    title: poll.title,
    createdAt: poll.createdAt,
    deadline: poll.deadline,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
    status: poll.deadline && poll.deadline < now ? 'ended' : 'active'
  }))

  res.json(pollList)
})

app.get('/api/polls/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const poll = polls.get(id)

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const clientIp = getClientIp(req)
  const now = Date.now()
  const isCreator = clientIp === poll.creatorIp
  const pollVotedIps = votedIpsByPoll.get(id) || new Set()
  const hasVoted = pollVotedIps.has(clientIp)
  const isEnded = poll.deadline ? poll.deadline < now : false

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    createdAt: poll.createdAt,
    deadline: poll.deadline,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0),
    isCreator,
    hasVoted,
    isEnded
  })
})

app.post('/api/polls/:id/vote', (req: Request, res: Response) => {
  const { id } = req.params
  const { optionId } = req.body
  const poll = polls.get(id)

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const clientIp = getClientIp(req)
  const pollVotedIps = votedIpsByPoll.get(id) || new Set()

  if (pollVotedIps.has(clientIp)) {
    return res.status(400).json({ error: '您已经投过票了' })
  }

  const now = Date.now()
  if (poll.deadline && poll.deadline < now) {
    return res.status(400).json({ error: '投票已截止' })
  }

  const option = poll.options.find(opt => opt.id === optionId)
  if (!option) {
    return res.status(400).json({ error: '无效的选项' })
  }

  option.votes++
  pollVotedIps.add(clientIp)
  votedIpsByPoll.set(id, pollVotedIps)

  res.json({
    success: true,
    options: poll.options,
    totalVotes: poll.options.reduce((sum, opt) => sum + opt.votes, 0)
  })
})

app.post('/api/polls/:id/reset', (req: Request, res: Response) => {
  const { id } = req.params
  const poll = polls.get(id)

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const clientIp = getClientIp(req)
  if (clientIp !== poll.creatorIp) {
    return res.status(403).json({ error: '只有创建者可以重置投票' })
  }

  poll.options.forEach(opt => {
    opt.votes = 0
  })
  const pollVotedIps = votedIpsByPoll.get(id)
  if (pollVotedIps) {
    pollVotedIps.clear()
  }

  res.json({
    success: true,
    options: poll.options,
    totalVotes: 0
  })
})

app.get('/api/polls/:id/results', (req: Request, res: Response) => {
  const { id } = req.params
  const poll = polls.get(id)

  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0)
  const now = Date.now()

  res.json({
    options: poll.options.map(opt => ({
      ...opt,
      percentage: totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0.0'
    })),
    totalVotes,
    isEnded: poll.deadline ? poll.deadline < now : false
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
