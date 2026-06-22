export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'tired'

export interface Capsule {
  id: string
  title: string
  content: string
  imageUrl: string
  mood: MoodType
  targetDate: string
  createdAt: string
  isOpened: boolean
  isNotified: boolean
}

export const MOOD_CONFIG: Record<MoodType, { color: string; emoji: string; label: string }> = {
  happy: { color: '#FBBF24', emoji: '😊', label: '开心' },
  calm: { color: '#60A5FA', emoji: '😌', label: '平静' },
  sad: { color: '#818CF8', emoji: '😢', label: '伤感' },
  angry: { color: '#F87171', emoji: '😠', label: '愤怒' },
  tired: { color: '#A78BFA', emoji: '😴', label: '疲惫' }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

class DataStore {
  private capsules: Capsule[] = []

  constructor() {
    this.initMockData()
  }

  private initMockData(): void {
    const now = new Date()
    const mockData: Capsule[] = [
      {
        id: generateId(),
        title: '给一年后的自己',
        content: '希望那时的你已经实现了今年的目标，变得更加优秀和自信。不要忘记现在努力的自己，加油！',
        imageUrl: 'https://picsum.photos/400/300?random=1',
        mood: 'happy',
        targetDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '下周的小目标',
        content: '读完那本一直想看的书，每天早起半小时，保持好心情。',
        imageUrl: 'https://picsum.photos/400/250?random=2',
        mood: 'calm',
        targetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '生日愿望',
        content: '又长大了一岁，希望家人身体健康，朋友一切顺利，自己能够保持热爱，奔赴山海。',
        imageUrl: 'https://picsum.photos/400/350?random=3',
        mood: 'happy',
        targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '毕业纪念',
        content: '今天毕业了，心里有点难过又有点期待。难过的是要和同学们分开，期待的是新的旅程。希望十年后再看这个的时候，我们都还保持联系。',
        imageUrl: 'https://picsum.photos/400/280?random=4',
        mood: 'sad',
        targetDate: new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '工作不顺心的一天',
        content: '今天被领导批评了，心里很不舒服。但我知道这是成长的一部分，希望未来的我能笑着回看今天，感谢这些挫折让我变得更强大。',
        imageUrl: 'https://picsum.photos/400/320?random=5',
        mood: 'angry',
        targetDate: new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '疲惫但充实',
        content: '最近工作很忙，每天都很累。但看着项目一点点成型，又觉得很有成就感。希望以后的自己能够劳逸结合，不要太累。',
        imageUrl: 'https://picsum.photos/400/260?random=6',
        mood: 'tired',
        targetDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '新年的第一天',
        content: '新的一年，新的开始。许个愿吧：希望今年能够去一次一直想去的城市旅行，希望能够学会弹吉他，希望能够遇到对的人。',
        imageUrl: 'https://picsum.photos/400/300?random=7',
        mood: 'happy',
        targetDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '一个安静的下午',
        content: '窗外下着小雨，泡了一杯茶，听着喜欢的歌。这种平静的感觉真好，希望以后也能常常拥有这样的时光。',
        imageUrl: 'https://picsum.photos/400/340?random=8',
        mood: 'calm',
        targetDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '和好朋友的约定',
        content: '今天和小明约定，五年后一起去西藏旅行。不知道那时候我们都变成什么样子了，但一定要记得这个约定啊！',
        imageUrl: 'https://picsum.photos/400/290?random=9',
        mood: 'happy',
        targetDate: new Date(now.getTime() + 1825 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '第一次做饭',
        content: '今天第一次自己做饭，虽然味道一般，但感觉很有成就感。希望以后的自己能做得越来越好，成为一个会生活的人。',
        imageUrl: 'https://picsum.photos/400/270?random=10',
        mood: 'happy',
        targetDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '一个月后的我',
        content: '这一个月要好好努力，把那个项目做完。然后奖励自己一顿大餐！',
        imageUrl: 'https://picsum.photos/400/310?random=11',
        mood: 'calm',
        targetDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      },
      {
        id: generateId(),
        title: '给未来自己的建议',
        content: '不管遇到什么困难，都要相信自己。你比想象中更强大。',
        imageUrl: 'https://picsum.photos/400/330?random=12',
        mood: 'calm',
        targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        isOpened: false,
        isNotified: false
      }
    ]
    this.capsules = mockData
  }

  createCapsule(data: Omit<Capsule, 'id' | 'createdAt' | 'isOpened' | 'isNotified'>): Capsule {
    const capsule: Capsule = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isOpened: false,
      isNotified: false
    }
    this.capsules.unshift(capsule)
    return capsule
  }

  getAllCapsules(): Capsule[] {
    return [...this.capsules]
  }

  getCapsuleById(id: string): Capsule | undefined {
    return this.capsules.find(c => c.id === id)
  }

  updateCapsule(id: string, updates: Partial<Capsule>): Capsule | undefined {
    const index = this.capsules.findIndex(c => c.id === id)
    if (index === -1) return undefined
    this.capsules[index] = { ...this.capsules[index], ...updates }
    return this.capsules[index]
  }

  deleteCapsule(id: string): boolean {
    const index = this.capsules.findIndex(c => c.id === id)
    if (index === -1) return false
    this.capsules.splice(index, 1)
    return true
  }

  getExpiredCapsules(): Capsule[] {
    const now = new Date()
    return this.capsules.filter(c => {
      const targetDate = new Date(c.targetDate)
      return targetDate <= now && !c.isNotified
    })
  }

  getRecentCapsules(limit: number = 5): Capsule[] {
    return [...this.capsules]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  markAsNotified(id: string): void {
    this.updateCapsule(id, { isNotified: true })
  }

  markAsOpened(id: string): void {
    this.updateCapsule(id, { isOpened: true })
  }
}

export const dataStore = new DataStore()
