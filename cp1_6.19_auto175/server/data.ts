import { v4 as uuidv4 } from 'uuid'

export interface PhaseScore {
  id: string
  phase: string
  score: number
  createdAt: string
}

export interface Reflection {
  id: string
  content: string
  createdAt: string
}

export interface Retrospective {
  id: string
  projectName: string
  phases: string[]
  date: string
  scores: PhaseScore[]
  reflections: Reflection[]
  createdAt: string
}

let retrospectives: Retrospective[] = []

const initialData: Retrospective[] = [
  {
    id: uuidv4(),
    projectName: '电商平台重构',
    phases: ['需求分析', '开发', '测试', '上线'],
    date: '2024-01-15',
    scores: [
      { id: uuidv4(), phase: '需求分析', score: 8, createdAt: '2024-01-15T10:00:00Z' },
      { id: uuidv4(), phase: '开发', score: 7, createdAt: '2024-01-15T10:05:00Z' },
      { id: uuidv4(), phase: '测试', score: 9, createdAt: '2024-01-15T10:10:00Z' },
      { id: uuidv4(), phase: '上线', score: 6, createdAt: '2024-01-15T10:15:00Z' },
    ],
    reflections: [
      { id: uuidv4(), content: '需求分析阶段团队沟通顺畅，产品经理准备充分，需求文档清晰明了。', createdAt: '2024-01-15T10:20:00Z' },
      { id: uuidv4(), content: '开发过程中遇到了一些技术债务，需要在后续项目中提前做好技术选型。', createdAt: '2024-01-15T10:25:00Z' },
      { id: uuidv4(), content: '测试覆盖率较高，自动化测试大大提高了代码质量。', createdAt: '2024-01-15T10:30:00Z' },
      { id: uuidv4(), content: '上线过程较为顺利，但灰度发布策略执行良好。', createdAt: '2024-01-15T10:35:00Z' },
    ],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: uuidv4(),
    projectName: '移动端APP迭代',
    phases: ['需求分析', '开发', '测试', '上线'],
    date: '2024-02-20',
    scores: [
      { id: uuidv4(), phase: '需求分析', score: 6, createdAt: '2024-02-20T14:00:00Z' },
      { id: uuidv4(), phase: '开发', score: 8, createdAt: '2024-02-20T14:05:00Z' },
      { id: uuidv4(), phase: '测试', score: 7, createdAt: '2024-02-20T14:10:00Z' },
      { id: uuidv4(), phase: '上线', score: 8, createdAt: '2024-02-20T14:15:00Z' },
    ],
    reflections: [
      { id: uuidv4(), content: '需求变更较多，影响了开发进度，需要加强需求评审流程。', createdAt: '2024-02-20T14:20:00Z' },
      { id: uuidv4(), content: '移动端适配工作比预期复杂，需要提前做好设备兼容性测试。', createdAt: '2024-02-20T14:25:00Z' },
      { id: uuidv4(), content: '性能优化效果明显，用户反馈良好。', createdAt: '2024-02-20T14:30:00Z' },
    ],
    createdAt: '2024-02-20T14:00:00Z',
  },
  {
    id: uuidv4(),
    projectName: '数据中台建设',
    phases: ['需求分析', '开发', '测试', '上线'],
    date: '2024-03-10',
    scores: [
      { id: uuidv4(), phase: '需求分析', score: 9, createdAt: '2024-03-10T09:00:00Z' },
      { id: uuidv4(), phase: '开发', score: 9, createdAt: '2024-03-10T09:05:00Z' },
      { id: uuidv4(), phase: '测试', score: 8, createdAt: '2024-03-10T09:10:00Z' },
      { id: uuidv4(), phase: '上线', score: 7, createdAt: '2024-03-10T09:15:00Z' },
    ],
    reflections: [
      { id: uuidv4(), content: '技术架构设计合理，为后续扩展打下了良好基础。', createdAt: '2024-03-10T09:20:00Z' },
      { id: uuidv4(), content: '数据建模过程严谨，数据质量得到保障。', createdAt: '2024-03-10T09:25:00Z' },
      { id: uuidv4(), content: '团队协作高效，代码审查机制运行良好。', createdAt: '2024-03-10T09:30:00Z' },
      { id: uuidv4(), content: '上线后遇到一些性能问题，需要优化查询性能。', createdAt: '2024-03-10T09:35:00Z' },
      { id: uuidv4(), content: '文档完善，便于后续维护。', createdAt: '2024-03-10T09:40:00Z' },
    ],
    createdAt: '2024-03-10T09:00:00Z',
  },
]

retrospectives = [...initialData]

export function getAllRetrospectives(): Retrospective[] {
  return [...retrospectives].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getRetrospectiveById(id: string): Retrospective | undefined {
  return retrospectives.find(r => r.id === id)
}

export function createRetrospective(data: Omit<Retrospective, 'id' | 'scores' | 'reflections' | 'createdAt'>): Retrospective {
  const newRetro: Retrospective = {
    id: uuidv4(),
    ...data,
    scores: [],
    reflections: [],
    createdAt: new Date().toISOString(),
  }
  retrospectives.unshift(newRetro)
  return newRetro
}

export function updateRetrospective(id: string, data: Partial<Retrospective>): Retrospective | undefined {
  const index = retrospectives.findIndex(r => r.id === id)
  if (index === -1) return undefined
  retrospectives[index] = { ...retrospectives[index], ...data }
  return retrospectives[index]
}

export function deleteRetrospective(id: string): boolean {
  const index = retrospectives.findIndex(r => r.id === id)
  if (index === -1) return false
  retrospectives.splice(index, 1)
  return true
}

export function addScore(retroId: string, phase: string, score: number): PhaseScore | undefined {
  const retro = retrospectives.find(r => r.id === retroId)
  if (!retro) return undefined
  
  const existingIndex = retro.scores.findIndex(s => s.phase === phase)
  const newScore: PhaseScore = {
    id: uuidv4(),
    phase,
    score,
    createdAt: new Date().toISOString(),
  }
  
  if (existingIndex >= 0) {
    retro.scores[existingIndex] = newScore
  } else {
    retro.scores.push(newScore)
  }
  
  return newScore
}

export function addReflection(retroId: string, content: string): Reflection | undefined {
  const retro = retrospectives.find(r => r.id === retroId)
  if (!retro) return undefined
  
  const newReflection: Reflection = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
  }
  
  retro.reflections.push(newReflection)
  return newReflection
}

export function deleteReflection(retroId: string, reflectionId: string): boolean {
  const retro = retrospectives.find(r => r.id === retroId)
  if (!retro) return false
  
  const index = retro.reflections.findIndex(r => r.id === reflectionId)
  if (index === -1) return false
  
  retro.reflections.splice(index, 1)
  return true
}

const stopWords = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '能', '可以', '什么', '这个', '那个', '但是', '因为', '所以',
  '我们', '你们', '他们', '她们', '它们', '就是', '还是', '或者', '以及', '的话',
  '如果', '虽然', '但是', '而且', '并且', '或者', '还是', '不是', '但是', '如果',
  '需要', '进行', '一些', '比较', '非常', '更加', '已经', '正在', '可能', '应该',
  '必须', '一定', '可能', '也许', '大概', '差不多', '左右', '前后', '上下',
  '之间', '其中', '之后', '之前', '以后', '以前', '现在', '当时', '时候', '时间',
  '地方', '方面', '方式', '方法', '问题', '情况', '状态', '结果', '效果', '作用',
  '影响', '原因', '因素', '部分', '整体', '过程', '阶段', '项目', '工作', '任务',
])

export function getAllKeywords(): { word: string; count: number }[] {
  const wordCount: Record<string, number> = {}
  
  retrospectives.forEach(retro => {
    retro.reflections.forEach(reflection => {
      const text = reflection.content
      const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || []
      
      words.forEach(word => {
        const w = word.toLowerCase()
        if (w.length >= 2 && !stopWords.has(w)) {
          wordCount[w] = (wordCount[w] || 0) + 1
        }
      })
    })
  })
  
  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

export function getRetrospectiveKeywords(retroId: string): { word: string; count: number }[] {
  const retro = retrospectives.find(r => r.id === retroId)
  if (!retro) return []
  
  const wordCount: Record<string, number> = {}
  
  retro.reflections.forEach(reflection => {
    const text = reflection.content
    const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || []
    
    words.forEach(word => {
      const w = word.toLowerCase()
      if (w.length >= 2 && !stopWords.has(w)) {
        wordCount[w] = (wordCount[w] || 0) + 1
      }
    })
  })
  
  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}
