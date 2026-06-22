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
}

type Listener = () => void

class DataStore {
  private capsules: Capsule[] = []
  private listeners: Set<Listener> = new Set()
  private notifiedIds: Set<string> = new Set()

  constructor() {
    this.seedDemoData()
  }

  private seedDemoData(): void {
    const today = new Date()
    const demos: Array<Omit<Capsule, 'id' | 'createdAt' | 'isOpened'>> = [
      {
        title: '给明年的自己',
        content: '希望你依然保持对生活的热爱，记得今天阳光很好，窗外的桂花开了。坚持写日记，坚持运动，记得多喝水。愿你温柔且坚定地走下去。',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        mood: 'calm',
        targetDate: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: '生日愿望',
        content: '今天是我的生日，吹灭蜡烛时许了三个愿望。希望家人平安健康，希望能完成那个拖延已久的项目，希望能遇到懂我的人。',
        imageUrl: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400&h=300&fit=crop',
        mood: 'happy',
        targetDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: '旅行的意义',
        content: '刚从海边回来，咸湿的海风还留在衣服上。看到日落的时候突然明白，有些风景要亲自去看，有些路要自己走才知道方向。',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
        mood: 'happy',
        targetDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: '夜深了',
        content: '凌晨两点，失眠。想起很多事情，有些遗憾也有些庆幸。明天又是新的一天，希望今晚能睡个好觉。',
        imageUrl: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&h=300&fit=crop',
        mood: 'tired',
        targetDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: '此刻的心情',
        content: '这是一个测试胶囊，设置为即将到期，用来验证提醒功能是否正常工作。',
        imageUrl: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=400&h=300&fit=crop',
        mood: 'calm',
        targetDate: today.toISOString().split('T')[0]
      }
    ]
    demos.forEach((d) => this.createCapsule(d))
  }

  private generateId(): string {
    return 'cap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb())
  }

  createCapsule(data: Omit<Capsule, 'id' | 'createdAt' | 'isOpened'>): Capsule {
    const capsule: Capsule = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      isOpened: false
    }
    this.capsules.unshift(capsule)
    this.notify()
    return capsule
  }

  getAllCapsules(): Capsule[] {
    return [...this.capsules]
  }

  getRecentCapsules(limit: number): Capsule[] {
    return this.capsules.slice(0, limit)
  }

  getDueCapsules(): Capsule[] {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return this.capsules.filter((c) => {
      const target = new Date(c.targetDate).getTime()
      const isDue = target <= today && !this.notifiedIds.has(c.id) && !c.isOpened
      if (isDue) {
        this.notifiedIds.add(c.id)
      }
      return isDue
    })
  }

  markAsOpened(id: string): void {
    const capsule = this.capsules.find((c) => c.id === id)
    if (capsule) {
      capsule.isOpened = true
      this.notify()
    }
  }

  subscribe(callback: Listener): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }
}

export const dataStore = new DataStore()
