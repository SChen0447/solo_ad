import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 8000

app.use(cors())
app.use(express.json())

interface Idea {
  id: string
  title: string
  description: string
  author: string
  voteCount: number
  createdAt: string
  priority: 'high' | 'medium' | 'low'
}

interface UserVotes {
  [userId: string]: {
    remainingVotes: number
    votedIdeas: string[]
  }
}

const MAX_VOTES_PER_USER = 5

const ideas: Idea[] = [
  {
    id: uuidv4(),
    title: '智能会议记录助手',
    description: '利用AI技术自动记录会议内容，生成会议纪要和待办事项，提高会议效率。',
    author: '张三',
    voteCount: 12,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    priority: 'high'
  },
  {
    id: uuidv4(),
    title: '团队健康打卡系统',
    description: '每日健康状况打卡，追踪团队成员的身心健康，提供个性化健康建议。',
    author: '李四',
    voteCount: 7,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    priority: 'medium'
  },
  {
    id: uuidv4(),
    title: '代码审查自动化工具',
    description: '集成AI代码审查，自动检测代码质量问题、安全漏洞和最佳实践违规。',
    author: '王五',
    voteCount: 15,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    priority: 'high'
  },
  {
    id: uuidv4(),
    title: '项目进度可视化看板',
    description: '实时展示项目进度、任务分配和里程碑，支持甘特图和看板两种视图。',
    author: '赵六',
    voteCount: 3,
    createdAt: new Date().toISOString(),
    priority: 'low'
  },
  {
    id: uuidv4(),
    title: '知识库智能搜索',
    description: '基于语义搜索的企业知识库，快速定位文档和知识点，提升学习效率。',
    author: '钱七',
    voteCount: 8,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    priority: 'medium'
  },
  {
    id: uuidv4(),
    title: '远程办公虚拟空间',
    description: '创建虚拟办公环境，支持虚拟工位、随机咖啡聊天和团队活动。',
    author: '孙八',
    voteCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    priority: 'low'
  }
]

const userVotes: UserVotes = {
  'default-user': {
    remainingVotes: MAX_VOTES_PER_USER,
    votedIdeas: []
  }
}

const users = [
  { id: 'user-1', name: '张三' },
  { id: 'user-2', name: '李四' },
  { id: 'user-3', name: '王五' },
  { id: 'default-user', name: '当前用户' }
]

function getPriority(voteCount: number): 'high' | 'medium' | 'low' {
  if (voteCount >= 10) return 'high'
  if (voteCount >= 5) return 'medium'
  return 'low'
}

app.get('/api/users', (req, res) => {
  res.json(users)
})

app.get('/api/ideas', (req, res) => {
  res.json(ideas)
})

app.post('/api/ideas', (req, res) => {
  const { title, description, author } = req.body

  if (!title || !description || !author) {
    return res.status(400).json({ error: '标题、描述和作者都是必填项' })
  }

  if (title.length > 30) {
    return res.status(400).json({ error: '标题不能超过30个字' })
  }

  if (description.length > 200) {
    return res.status(400).json({ error: '描述不能超过200个字' })
  }

  const newIdea: Idea = {
    id: uuidv4(),
    title,
    description,
    author,
    voteCount: 0,
    createdAt: new Date().toISOString(),
    priority: 'low'
  }

  ideas.unshift(newIdea)
  res.status(201).json(newIdea)
})

app.post('/api/ideas/:id/vote', (req, res) => {
  const { id } = req.params
  const { userId = 'default-user' } = req.body

  const idea = ideas.find(i => i.id === id)
  if (!idea) {
    return res.status(404).json({ error: '创意不存在' })
  }

  if (!userVotes[userId]) {
    userVotes[userId] = {
      remainingVotes: MAX_VOTES_PER_USER,
      votedIdeas: []
    }
  }

  const userVoteData = userVotes[userId]

  if (userVoteData.remainingVotes <= 0) {
    return res.status(400).json({ error: '投票次数已用完', remainingVotes: 0 })
  }

  idea.voteCount += 1
  idea.priority = getPriority(idea.voteCount)
  userVoteData.remainingVotes -= 1
  userVoteData.votedIdeas.push(id)

  res.json({
    idea,
    remainingVotes: userVoteData.remainingVotes
  })
})

app.get('/api/user-votes', (req, res) => {
  const { userId = 'default-user' } = req.query as { userId: string }

  if (!userVotes[userId]) {
    userVotes[userId] = {
      remainingVotes: MAX_VOTES_PER_USER,
      votedIdeas: []
    }
  }

  res.json(userVotes[userId])
})

app.get('/api/ideas/ranked', (req, res) => {
  const rankedIdeas = [...ideas].sort((a, b) => b.voteCount - a.voteCount)
  res.json(rankedIdeas)
})

app.put('/api/ideas/:id/priority', (req, res) => {
  const { id } = req.params
  const { priority } = req.body

  const idea = ideas.find(i => i.id === id)
  if (!idea) {
    return res.status(404).json({ error: '创意不存在' })
  }

  if (!['high', 'medium', 'low'].includes(priority)) {
    return res.status(400).json({ error: '无效的优先级' })
  }

  idea.priority = priority
  res.json(idea)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
