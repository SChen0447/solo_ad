import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Animal {
  id: string
  name: string
  species: string
  breed: string
  age: number
  description: string
  imageUrl: string
  status: 'available' | 'adopted' | 'pending'
  personality: string[]
  story: string
  health: string
}

interface AdoptionApplication {
  id: string
  applicantName: string
  phone: string
  address: string
  reason: string
  animalId: string
  animalName: string
  status: 'pending' | 'approved' | 'rejected'
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
    species: '猫',
    breed: '中华田园猫',
    age: 2,
    description: '温柔可爱的小花猫，喜欢被抚摸',
    imageUrl: '',
    status: 'available',
    personality: ['亲人', '安静', '温柔'],
    story: '小花是在一个雨夜被志愿者在街角发现的，当时她瑟瑟发抖地躲在垃圾桶旁边。经过悉心照料，她已经变成了一只健康活泼的猫咪，最喜欢在窗台晒太阳。',
    health: '已绝育、已驱虫、已接种疫苗，体检一切正常'
  },
  {
    id: uuidv4(),
    name: '旺财',
    species: '狗',
    breed: '金毛寻回犬',
    age: 3,
    description: '活泼开朗的金毛，最爱玩球',
    imageUrl: '',
    status: 'available',
    personality: ['活泼', '忠诚', '友善'],
    story: '旺财的前主人因为搬家无法继续照顾他，将他送到收容所。他非常依恋人类，每次看到有人来都会摇着尾巴迎接，是个天生的暖男。',
    health: '已绝育、已驱虫、已接种疫苗，髋关节检查正常'
  },
  {
    id: uuidv4(),
    name: '咪咪',
    species: '猫',
    breed: '英短蓝猫',
    age: 1,
    description: '圆脸大眼的蓝色小精灵',
    imageUrl: '',
    status: 'available',
    personality: ['好奇', '贪玩', '粘人'],
    story: '咪咪是被遗弃在公寓楼道里的，邻居发现后送到了收容所。她非常好奇，总是第一个探索新玩具，还喜欢趴在键盘上"帮忙"打字。',
    health: '已驱虫、已接种疫苗，体重略轻需增肥'
  },
  {
    id: uuidv4(),
    name: '大黄',
    species: '狗',
    breed: '中华田园犬',
    age: 4,
    description: '憨厚忠诚的中华田园犬',
    imageUrl: '',
    status: 'available',
    personality: ['忠诚', '勇敢', '温顺'],
    story: '大黄一直在工厂看门，工厂关闭后无家可归。他非常聪明，能听懂很多指令，是最可靠的伙伴。',
    health: '已绝育、已驱虫、已接种疫苗，身体非常健康'
  },
  {
    id: uuidv4(),
    name: '雪球',
    species: '猫',
    breed: '布偶猫',
    age: 2,
    description: '优雅美丽的白色布偶猫',
    imageUrl: '',
    status: 'available',
    personality: ['安静', '优雅', '亲人'],
    story: '雪球曾是一位老人的伴侣，老人去世后无人照顾。她性格温柔安静，喜欢被人抱在怀里，会发出满足的呼噜声。',
    health: '已绝育、已驱虫、已接种疫苗，需定期梳理毛发'
  },
  {
    id: uuidv4(),
    name: '豆豆',
    species: '狗',
    breed: '柯基犬',
    age: 1,
    description: '短腿小电臀，跑起来超可爱',
    imageUrl: '',
    status: 'available',
    personality: ['活泼', '调皮', '聪明'],
    story: '豆豆因为前主人家中过敏被送来收容所。他精力充沛，最爱追球和在草地上打滚，那圆滚滚的电臀跑起来让人忍俊不禁。',
    health: '已驱虫、已接种疫苗，脊椎需注意保护'
  },
  {
    id: uuidv4(),
    name: '橘子',
    species: '猫',
    breed: '橘猫',
    age: 3,
    description: '圆滚滚的橘色大胖子',
    imageUrl: '',
    status: 'available',
    personality: ['贪吃', '慵懒', '友善'],
    story: '橘子是收容所的"代言人"，体重已达12斤。他最大的爱好就是吃和睡，任何食物都能让他发出幸福的呼噜声。俗话说"十橘九胖"，他就是那第十个——更胖。',
    health: '已绝育、已驱虫、已接种疫苗，需控制体重'
  },
  {
    id: uuidv4(),
    name: '小白',
    species: '兔',
    breed: '荷兰垂耳兔',
    age: 1,
    description: '毛茸茸的垂耳小白兔',
    imageUrl: '',
    status: 'available',
    personality: ['安静', '胆小', '可爱'],
    story: '小白是从宠物市场解救出来的，她非常温柔胆小，需要耐心慢慢靠近。一旦熟悉后，她会主动蹭你的手要零食。',
    health: '已驱虫、牙齿正常，需提供充足干草'
  },
  {
    id: uuidv4(),
    name: '阿福',
    species: '狗',
    breed: '拉布拉多',
    age: 5,
    description: '稳重温和的拉布拉多',
    imageUrl: '',
    status: 'available',
    personality: ['温和', '稳重', '耐心'],
    story: '阿福曾是一只导盲犬候选，因性格过于温顺不够强势而"退役"。他非常适合有小朋友的家庭，对小孩有着无限的耐心。',
    health: '已绝育、已驱虫、已接种疫苗，关节轻微磨损需注意'
  },
  {
    id: uuidv4(),
    name: '点点',
    species: '猫',
    breed: '奶牛猫',
    age: 2,
    description: '黑白相间的调皮鬼',
    imageUrl: '',
    status: 'available',
    personality: ['活泼', '调皮', '聪明'],
    story: '点点是收容所的"越狱大师"，总能找到办法打开笼子。她精力旺盛，喜欢追逐游戏和恶作剧，是猫中的喜剧演员。',
    health: '已绝育、已驱虫、已接种疫苗，身体非常健康'
  }
]

const adoptions: AdoptionApplication[] = []

const announcements: Announcement[] = [
  { id: uuidv4(), content: '新来的猫咪小花等待领养，快来认识她吧！', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '本周日举办领养日开放活动，欢迎前来参观！', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '冬季送暖：领养动物免费赠送冬季保暖礼包', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '收容所新增猫咪绝育优惠计划，详情咨询前台', createdAt: new Date().toISOString() },
  { id: uuidv4(), content: '感谢社区爱心人士捐赠的猫粮和狗粮！', createdAt: new Date().toISOString() },
]

app.get('/api/animals', (_req: Request, res: Response) => {
  res.json(animals)
})

app.get('/api/announcements', (_req: Request, res: Response) => {
  res.json(announcements)
})

app.get('/api/adoptions', (_req: Request, res: Response) => {
  res.json(adoptions)
})

app.post('/api/adopt', (req: Request, res: Response) => {
  const { applicantName, phone, address, reason, animalId } = req.body
  if (!applicantName || !phone || !address || !reason || !animalId) {
    res.status(400).json({ error: '请填写所有必填字段' })
    return
  }
  const animal = animals.find(a => a.id === animalId)
  if (!animal) {
    res.status(404).json({ error: '未找到该动物' })
    return
  }
  const application: AdoptionApplication = {
    id: uuidv4(),
    applicantName,
    phone,
    address,
    reason,
    animalId,
    animalName: animal.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  adoptions.push(application)
  animal.status = 'pending'
  res.status(201).json(application)
})

app.put('/api/adopt/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: '无效的审核状态' })
    return
  }
  const application = adoptions.find(a => a.id === id)
  if (!application) {
    res.status(404).json({ error: '未找到该申请' })
    return
  }
  application.status = status
  application.reviewedAt = new Date().toISOString()
  const animal = animals.find(a => a.id === application.animalId)
  if (animal) {
    animal.status = status === 'approved' ? 'adopted' : 'available'
  }
  res.json(application)
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
