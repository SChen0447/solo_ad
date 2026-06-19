import express from 'express'
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
  creatorToken: string
  votedIps: Set<string>
  votes: Map<string, string>
}

const polls = new Map<string, Poll>()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || '127.0.0.1'
}

function pollToResponse(poll: Poll) {
  return {
    id: poll.id,
    title: poll.title,
    options: poll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes })),
    createdAt: poll.createdAt,
    deadline: poll.deadline,
    totalVotes: poll.options.reduce((sum, o) => sum + o.votes, 0),
    isExpired: poll.deadline ? Date.now() > poll.deadline : false
  }
}

app.post('/api/polls', (req, res) => {
  const { title, options, deadline } = req.body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '请输入投票标题' })
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    return res.status(400).json({ error: '选项数量必须在2-10个之间' })
  }

  const validOptions = options.filter((o: any) => typeof o === 'string' && o.trim().length > 0)
  if (validOptions.length !== options.length) {
    return res.status(400).json({ error: '所有选项不能为空' })
  }

  const pollId = uuidv4()
  const creatorToken = uuidv4()
  const poll: Poll = {
    id: pollId,
    title: title.trim(),
    options: validOptions.map((text: string) => ({
      id: uuidv4(),
      text: text.trim(),
      votes: 0
    })),
    createdAt: Date.now(),
    deadline: deadline ? new Date(deadline).getTime() : undefined,
    creatorToken,
    votedIps: new Set(),
    votes: new Map()
  }

  polls.set(pollId, poll)

  res.status(201).json({
    ...pollToResponse(poll),
    creatorToken
  })
})

app.get('/api/polls', (_req, res) => {
  const list = Array.from(polls.values()).map(pollToResponse)
  list.sort((a, b) => b.createdAt - a.createdAt)
  res.json(list)
})

app.get('/api/polls/:id', (req, res) => {
  const poll = polls.get(req.params.id)
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const clientIp = getClientIp(req)
  const hasVoted = poll.votedIps.has(clientIp)
  const userVote = poll.votes.get(clientIp)

  res.json({
    ...pollToResponse(poll),
    hasVoted,
    userVote
  })
})

app.post('/api/polls/:id/vote', (req, res) => {
  const poll = polls.get(req.params.id)
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  if (poll.deadline && Date.now() > poll.deadline) {
    return res.status(400).json({ error: '投票已截止' })
  }

  const { optionId } = req.body
  if (!optionId) {
    return res.status(400).json({ error: '请选择一个选项' })
  }

  const clientIp = getClientIp(req)
  if (poll.votedIps.has(clientIp)) {
    return res.status(400).json({ error: '您已经投过票了' })
  }

  const option = poll.options.find(o => o.id === optionId)
  if (!option) {
    return res.status(400).json({ error: '选项不存在' })
  }

  option.votes++
  poll.votedIps.add(clientIp)
  poll.votes.set(clientIp, optionId)

  res.json(pollToResponse(poll))
})

app.post('/api/polls/:id/reset', (req, res) => {
  const poll = polls.get(req.params.id)
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' })
  }

  const { creatorToken } = req.body
  if (!creatorToken || creatorToken !== poll.creatorToken) {
    return res.status(403).json({ error: '无权限操作' })
  }

  poll.options.forEach(o => { o.votes = 0 })
  poll.votedIps.clear()
  poll.votes.clear()

  res.json(pollToResponse(poll))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
