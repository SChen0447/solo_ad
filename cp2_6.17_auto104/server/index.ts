import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type {
  Stage,
  Comment,
  CreateStageRequest,
  VoteRequest,
  CreateCommentRequest,
  StageRatings,
} from '../shared/types.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const stages = new Map<string, Stage>()
const comments: Comment[] = []

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
  'linear-gradient(135deg, #f5576c, #ff6a88)',
  'linear-gradient(135deg, #667eea, #f093fb)',
]

function computeRatings(): StageRatings[] {
  const result: StageRatings[] = []
  stages.forEach((stage) => {
    const scores = stage.scores
    const voteCount = scores.length
    const averageScore = voteCount > 0 ? scores.reduce((a, b) => a + b, 0) / voteCount : 0
    const maxScore = voteCount > 0 ? Math.max(...scores) : 0
    result.push({
      stageId: stage.id,
      stageName: stage.name,
      averageScore: Math.round(averageScore * 100) / 100,
      voteCount,
      maxScore,
    })
  })
  return result
}

app.get('/api/stages', (_req: Request, res: Response) => {
  const list = Array.from(stages.values())
  res.json(list)
})

app.post('/api/stages', (req: Request, res: Response) => {
  if (stages.size >= 10) {
    res.status(400).json({ error: '最多支持10个舞台' })
    return
  }
  const body = req.body as CreateStageRequest
  if (!body.name || !body.description || !body.startTime) {
    res.status(400).json({ error: '请填写完整信息' })
    return
  }
  const id = uuidv4()
  const stage: Stage = {
    id,
    name: body.name,
    description: body.description,
    startTime: body.startTime,
    votingOpen: false,
    scores: [],
    createdAt: Date.now(),
  }
  stages.set(id, stage)
  res.json(stage)
})

app.post('/api/stages/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params
  const stage = stages.get(id)
  if (!stage) {
    res.status(404).json({ error: '舞台不存在' })
    return
  }
  stage.votingOpen = !stage.votingOpen
  res.json(stage)
})

app.post('/api/stages/:id/vote', (req: Request, res: Response) => {
  const { id } = req.params
  const stage = stages.get(id)
  if (!stage) {
    res.status(404).json({ error: '舞台不存在' })
    return
  }
  if (!stage.votingOpen) {
    res.status(400).json({ success: false, message: '该舞台投票已关闭' })
    return
  }
  const body = req.body as VoteRequest
  if (!body.score || body.score < 1 || body.score > 5) {
    res.status(400).json({ success: false, message: '评分需为1-5星' })
    return
  }
  if (!body.seatNumber) {
    res.status(400).json({ success: false, message: '请输入座位号' })
    return
  }
  stage.scores.push(body.score)
  res.json({ success: true, message: '评分成功' })
})

app.get('/api/ratings', (_req: Request, res: Response) => {
  res.json({ stages: computeRatings() })
})

app.get('/api/comments', (req: Request, res: Response) => {
  const stageId = req.query.stageId as string | undefined
  let result = comments
  if (stageId) {
    result = comments.filter((c) => c.stageId === stageId)
  }
  res.json(result)
})

app.post('/api/comments', (req: Request, res: Response) => {
  const body = req.body as CreateCommentRequest
  if (!body.stageId || !body.nickname || !body.content || !body.score) {
    res.status(400).json({ error: '请填写完整信息' })
    return
  }
  const stage = stages.get(body.stageId)
  if (!stage) {
    res.status(404).json({ error: '舞台不存在' })
    return
  }
  const comment: Comment = {
    id: uuidv4(),
    stageId: body.stageId,
    nickname: body.nickname,
    content: body.content,
    score: body.score,
    avatarGradient: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
    createdAt: Date.now(),
  }
  comments.unshift(comment)
  res.json(comment)
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})
