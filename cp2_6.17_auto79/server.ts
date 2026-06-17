import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

type PollType = 'choice' | 'open'

interface ChoiceOption {
  id: string
  text: string
  votes: number
}

interface OpenSubmission {
  id: string
  userId: string
  nickname: string
  text: string
  timestamp: number
}

interface Topic {
  id: string
  type: PollType
  title: string
  status: 'active' | 'ended'
  createdAt: number
  options?: ChoiceOption[]
  submissions?: OpenSubmission[]
  votedUsers: Set<string>
}

interface Room {
  id: string
  hostId: string
  currentTopic: Topic | null
  topics: Topic[]
  members: Map<string, string>
}

const rooms: Map<string, Room> = new Map()

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  if (rooms.has(code)) return generateRoomCode()
  return code
}

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const { nickname, roomId } = req.body
    const userId = uuidv4()
    let targetRoomId = roomId?.trim().toUpperCase()

    if (!targetRoomId) {
      targetRoomId = generateRoomCode()
      const room: Room = {
        id: targetRoomId,
        hostId: userId,
        currentTopic: null,
        topics: [],
        members: new Map()
      }
      room.members.set(userId, nickname || '匿名用户')
      rooms.set(targetRoomId, room)
      return res.json({ roomId: targetRoomId, userId, isHost: true, nickname: nickname || '匿名用户' })
    }

    const room = rooms.get(targetRoomId)
    if (!room) {
      const newRoom: Room = {
        id: targetRoomId,
        hostId: userId,
        currentTopic: null,
        topics: [],
        members: new Map()
      }
      newRoom.members.set(userId, nickname || '匿名用户')
      rooms.set(targetRoomId, newRoom)
      return res.json({ roomId: targetRoomId, userId, isHost: true, nickname: nickname || '匿名用户' })
    }

    room.members.set(userId, nickname || '匿名用户')
    return res.json({
      roomId: targetRoomId,
      userId,
      isHost: room.hostId === userId,
      nickname: nickname || '匿名用户'
    })
  } catch (e) {
    return res.status(500).json({ error: '创建房间失败' })
  }
})

app.get('/api/rooms/:roomId/status', (req: Request, res: Response) => {
  const room = rooms.get(req.params.roomId.toUpperCase())
  if (!room) {
    return res.status(404).json({ error: '房间不存在' })
  }

  const topic = room.currentTopic
  if (!topic) {
    return res.json({ hasTopic: false })
  }

  if (topic.type === 'choice') {
    const total = topic.options!.reduce((s, o) => s + o.votes, 0)
    return res.json({
      hasTopic: true,
      topic: {
        id: topic.id,
        type: topic.type,
        title: topic.title,
        status: topic.status,
        options: topic.options!.map(o => ({ id: o.id, text: o.text })),
        votedCount: total
      }
    })
  } else {
    return res.json({
      hasTopic: true,
      topic: {
        id: topic.id,
        type: topic.type,
        title: topic.title,
        status: topic.status,
        votedCount: topic.submissions!.length
      }
    })
  }
})

app.post('/api/rooms/:roomId/topics', (req: Request, res: Response) => {
  const room = rooms.get(req.params.roomId.toUpperCase())
  if (!room) return res.status(404).json({ error: '房间不存在' })
  if (room.hostId !== req.body.userId) return res.status(403).json({ error: '只有主持人可以发起议题' })

  const { type, title, options } = req.body
  if (!type || !title) return res.status(400).json({ error: '缺少必要参数' })

  if (type === 'choice') {
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({ error: '选项数量必须在2-6个之间' })
    }
  }

  if (room.currentTopic) {
    room.currentTopic.status = 'ended'
  }

  const topic: Topic = {
    id: uuidv4(),
    type: type as PollType,
    title,
    status: 'active',
    createdAt: Date.now(),
    votedUsers: new Set()
  }

  if (type === 'choice') {
    topic.options = options.map((text: string, idx: number) => ({
      id: `opt_${idx}`,
      text,
      votes: 0
    }))
  } else {
    topic.submissions = []
  }

  room.currentTopic = topic
  room.topics.push(topic)
  return res.json({ success: true, topicId: topic.id })
})

app.post('/api/rooms/:roomId/vote', (req: Request, res: Response) => {
  const room = rooms.get(req.params.roomId.toUpperCase())
  if (!room) return res.status(404).json({ error: '房间不存在' })

  const topic = room.currentTopic
  if (!topic || topic.status !== 'active') return res.status(400).json({ error: '当前没有进行中的议题' })

  const { userId, optionId, text, nickname } = req.body
  if (!userId) return res.status(400).json({ error: '缺少用户ID' })

  if (topic.votedUsers.has(userId)) {
    return res.status(400).json({ error: '您已经提交过了' })
  }

  if (topic.type === 'choice') {
    const option = topic.options!.find(o => o.id === optionId)
    if (!option) return res.status(400).json({ error: '选项不存在' })
    option.votes++
  } else {
    if (!text || !text.trim()) return res.status(400).json({ error: '观点内容不能为空' })
    topic.submissions!.push({
      id: uuidv4(),
      userId,
      nickname: nickname || '匿名',
      text: text.trim(),
      timestamp: Date.now()
    })
  }

  topic.votedUsers.add(userId)
  const total = topic.type === 'choice'
    ? topic.options!.reduce((s, o) => s + o.votes, 0)
    : topic.submissions!.length

  return res.json({ success: true, votedCount: total })
})

app.post('/api/rooms/:roomId/end-topic', (req: Request, res: Response) => {
  const room = rooms.get(req.params.roomId.toUpperCase())
  if (!room) return res.status(404).json({ error: '房间不存在' })
  if (room.hostId !== req.body.userId) return res.status(403).json({ error: '只有主持人可以结束议题' })

  const topic = room.currentTopic
  if (!topic) return res.status(400).json({ error: '当前没有进行中的议题' })

  topic.status = 'ended'

  if (topic.type === 'choice') {
    const total = topic.options!.reduce((s, o) => s + o.votes, 0)
    const results = topic.options!.map(o => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: total > 0 ? Number(((o.votes / total) * 100).toFixed(1)) : 0
    }))
    return res.json({ type: 'choice', total, results })
  } else {
    const submissions = topic.submissions!
    const wordCount: Map<string, { count: number; texts: string[] }> = new Map()
    const stopWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '嘛', '啊', '吧', '呢', '吗', '哈', '嗯', '哦', '我们', '他们', '她们', '它们', '那', '这个', '那个', '什么', '怎么', '为什么', '可以', '但是', '因为', '所以', '如果', '虽然', '然后', '现在', '还是', '其实', '感觉', '觉得', '应该', '可能', '只是', '或者', '以及', '的话', '一下', '一些', '这样', '那样'])

    submissions.forEach(sub => {
      const words = sub.text.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{2,}/g) || []
      words.forEach(w => {
        const word = w.toLowerCase()
        if (stopWords.has(word) || word.length < 2) return
        if (!wordCount.has(word)) {
          wordCount.set(word, { count: 0, texts: [] })
        }
        const entry = wordCount.get(word)!
        entry.count++
        if (entry.texts.length < 3 && !entry.texts.includes(sub.text)) {
          entry.texts.push(sub.text)
        }
      })
    })

    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([word, data]) => ({
        word,
        count: data.count,
        texts: data.texts
      }))

    return res.json({
      type: 'open',
      total: submissions.length,
      words: sortedWords,
      allSubmissions: submissions
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
