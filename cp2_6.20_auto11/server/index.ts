import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

type AnimalStatus = 'available' | 'adopted'

interface Animal {
  id: string
  name: string
  species: 'dog' | 'cat' | 'rabbit' | 'other'
  breed: string
  age: number
  description: string
  imageUrl: string
  status: AnimalStatus
  tags: string[]
  story: string
  health: string
}

type AdoptionStatus = 'pending' | 'approved' | 'rejected'

interface AdoptionApplication {
  id: string
  animalId: string
  animalName: string
  applicantName: string
  phone: string
  address: string
  reason: string
  status: AdoptionStatus
  createdAt: string
  reviewedAt?: string
}

interface Announcement {
  id: string
  content: string
  createdAt: string
}

const animals: Animal[] = [
  {
    id: uuidv4(),
    name: '小花',
    species: 'cat',
    breed: '中华田园猫',
    age: 2,
    description: '一只温顺可爱的橘猫',
    imageUrl: 'cat',
    status: 'available',
    tags: ['亲人', '安静', '爱干净'],
    story: '小花是在社区附近被救助的，当时她瘦弱且害怕陌生人。经过工作人员两个月的悉心照料，现在的她已经完全恢复健康，非常喜欢和人亲近。',
    health: '已完成驱虫、疫苗接种，身体健康，已绝育。'
  },
  {
    id: uuidv4(),
    name: '大黄',
    species: 'dog',
    breed: '金毛寻回犬',
    age: 3,
    description: '活泼友善的大暖男',
    imageUrl: 'dog',
    status: 'available',
    tags: ['活泼', '亲人', '友善'],
    story: '大黄原本是有主人的，但因为主人搬家无法继续照顾他，所以来到了收容所。他性格非常好，喜欢和小朋友玩耍。',
    health: '已完成所有疫苗接种，定期驱虫，身体健康。'
  },
  {
    id: uuidv4(),
    name: '雪球',
    species: 'rabbit',
    breed: '荷兰垂耳兔',
    age: 1,
    description: '毛茸茸的小可爱',
    imageUrl: 'rabbit',
    status: 'available',
    tags: ['安静', '胆小', '乖巧'],
    story: '雪球是从一个不负责的繁殖场解救出来的，刚来时非常胆小。现在已经慢慢适应了人类的陪伴，会主动跑到人身边要食物。',
    health: '已完成驱虫和基础体检，健康状况良好。'
  },
  {
    id: uuidv4(),
    name: '豆豆',
    species: 'cat',
    breed: '英国短毛猫',
    age: 1,
    description: '好奇心旺盛的蓝猫',
    imageUrl: 'cat',
    status: 'available',
    tags: ['活泼', '好奇', '聪明'],
    story: '豆豆是在公园被发现的流浪猫，当时还是一只小奶猫。现在已经长成了英俊的小伙子，非常喜欢探索新事物。',
    health: '已完成疫苗接种和驱虫，身体非常健康。'
  },
  {
    id: uuidv4(),
    name: '旺财',
    species: 'dog',
    breed: '中华田园犬',
    age: 4,
    description: '忠诚憨厚的守护者',
    imageUrl: 'dog',
    status: 'available',
    tags: ['忠诚', '安静', '勇敢'],
    story: '旺财在街头流浪了很长时间，被救助时身上有多处伤口。经过治疗和调养，现在完全康复，对救助他的工作人员非常感恩。',
    health: '已绝育、完成全部疫苗接种，健康状况良好。'
  },
  {
    id: uuidv4(),
    name: '咪咪',
    species: 'cat',
    breed: '布偶猫',
    age: 2,
    description: '优雅温柔的小公主',
    imageUrl: 'cat',
    status: 'available',
    tags: ['亲人', '安静', '温柔'],
    story: '咪咪因为原主人过敏严重被送到收容所，她性格非常温顺，喜欢被人抱着，是个标准的黏人精。',
    health: '已绝育、疫苗齐全，定期体检，身体健康。'
  },
  {
    id: uuidv4(),
    name: '小黑',
    species: 'dog',
    breed: '拉布拉多',
    age: 5,
    description: '沉稳懂事的老伙计',
    imageUrl: 'dog',
    status: 'available',
    tags: ['安静', '懂事', '忠诚'],
    story: '小黑的原主人因病去世，他被送到了收容所。他非常懂事，从不给工作人员添麻烦，只是默默等待新的家庭。',
    health: '年龄稍大但身体健康，已完成全部疫苗接种。'
  },
  {
    id: uuidv4(),
    name: '白白',
    species: 'rabbit',
    breed: '侏儒兔',
    age: 1,
    description: '迷你可爱的小白兔',
    imageUrl: 'rabbit',
    status: 'available',
    tags: ['活泼', '亲人', '可爱'],
    story: '白白是作为宠物被购买后又遭遗弃的，幸运的是被好心人送到了收容所。他非常活泼，喜欢在围栏里蹦蹦跳跳。',
    health: '已完成驱虫，健康状况良好。'
  },
  {
    id: uuidv4(),
    name: '橘子',
    species: 'cat',
    breed: '橘猫',
    age: 3,
    description: '胖乎乎的吃货',
    imageUrl: 'cat',
    status: 'available',
    tags: ['亲人', '活泼', '贪吃'],
    story: '橘子是典型的橘猫性格，见到食物就走不动路。他非常亲人，见到人就会主动蹭腿要摸摸。',
    health: '体重略高，已绝育，疫苗齐全，整体健康。'
  },
  {
    id: uuidv4(),
    name: '皮皮',
    species: 'other',
    breed: '仓鼠',
    age: 1,
    description: '调皮好动的小毛球',
    imageUrl: 'other',
    status: 'available',
    tags: ['活泼', '好奇', '胆小'],
    story: '皮皮是小朋友家长觉得麻烦后送过来的，但他其实非常可爱，喜欢在跑轮上跑一整晚。',
    health: '状态良好，毛发顺滑。'
  },
  {
    id: uuidv4(),
    name: '阿奇',
    species: 'dog',
    breed: '柴犬',
    age: 2,
    description: '傲娇的表情包担当',
    imageUrl: 'dog',
    status: 'available',
    tags: ['活泼', '聪明', '独立'],
    story: '阿奇因为原主人工作调动被送到收容所，他是一只典型的柴犬，聪明但有点小傲娇，需要有耐心的主人。',
    health: '已完成全部疫苗接种，健康活泼。'
  },
  {
    id: uuidv4(),
    name: '小灰',
    species: 'cat',
    breed: '狸花猫',
    age: 4,
    description: '独立优雅的小绅士',
    imageUrl: 'cat',
    status: 'available',
    tags: ['安静', '独立', '爱干净'],
    story: '小灰是流浪猫二代，在收容所出生长大。他性格比较独立，适合喜欢安静陪伴的主人。',
    health: '已绝育、疫苗齐全，身体健康。'
  }
]

const adoptionApplications: AdoptionApplication[] = []

const announcements: Announcement[] = [
  { id: uuidv4(), content: '新来的猫咪小花等待领养，快来看看吧！', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '本周日（6月23日）将举办领养日开放活动，欢迎大家前来！', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '感谢社会各界爱心人士对收容所的捐赠支持！', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '夏季炎热，请各位领养人注意给宠物做好防暑降温工作。', createdAt: new Date().toISOString() }
]

app.get('/api/animals', (_req: Request, res: Response) => {
  res.json(animals)
})

app.get('/api/announcements', (_req: Request, res: Response) => {
  res.json(announcements)
})

app.get('/api/adoptions', (_req: Request, res: Response) => {
  res.json(adoptionApplications)
})

app.post('/api/adopt', (req: Request, res: Response) => {
  const { animalId, applicantName, phone, address, reason } = req.body

  if (!animalId || !applicantName || !phone || !address || !reason) {
    return res.status(400).json({ error: '请填写完整的申请信息' })
  }

  const animal = animals.find(a => a.id === animalId)
  if (!animal) {
    return res.status(404).json({ error: '未找到该动物' })
  }

  const application: AdoptionApplication = {
    id: uuidv4(),
    animalId,
    animalName: animal.name,
    applicantName,
    phone,
    address,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  }

  adoptionApplications.push(application)

  res.status(201).json({
    message: '申请已提交',
    application
  })
})

app.put('/api/adopt/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' })
  }

  const application = adoptionApplications.find(a => a.id === id)
  if (!application) {
    return res.status(404).json({ error: '未找到该申请' })
  }

  application.status = status as AdoptionStatus
  application.reviewedAt = new Date().toISOString()

  if (status === 'approved') {
    const animal = animals.find(a => a.id === application.animalId)
    if (animal) {
      animal.status = 'adopted'
    }
  }

  res.json({
    message: '申请状态已更新',
    application
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
