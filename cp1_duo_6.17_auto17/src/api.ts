export interface Account {
  id: string
  name: string
  platform: 'weibo' | 'wechat' | 'xiaohongshu'
  color: string
  icon: string
}

export type ContentType = 'short_text' | 'long_article' | 'image_set' | 'video'

export interface Task {
  id: string
  accountId: string
  title: string
  type: ContentType
  summary: string
  date: string
  status: 'scheduled' | 'published' | 'draft'
  estimatedViews: number
  estimatedEngagement: number
}

export interface DuplicateResult {
  task1Id: string
  task2Id: string
  similarity: number
}

export interface HistoryData {
  date: string
  [accountId: string]: number | string
}

const BASE_URL = '/api'

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const res = await fetch(`${BASE_URL}/accounts`)
    return await res.json()
  } catch {
    return getMockAccounts()
  }
}

export const createAccount = async (account: Omit<Account, 'id'>): Promise<Account> => {
  try {
    const res = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    })
    return await res.json()
  } catch {
    const id = 'acc_' + Date.now()
    return { ...account, id }
  }
}

export const getTasks = async (): Promise<Task[]> => {
  try {
    const res = await fetch(`${BASE_URL}/tasks`)
    return await res.json()
  } catch {
    return getMockTasks()
  }
}

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  try {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    })
    return await res.json()
  } catch {
    const id = 'task_' + Date.now()
    return { ...task, id }
  }
}

export const deleteTask = async (id: string): Promise<void> => {
  try {
    await fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE' })
  } catch {}
}

export const checkDuplicate = async (taskIds: string[]): Promise<DuplicateResult[]> => {
  try {
    const res = await fetch(`${BASE_URL}/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds })
    })
    return await res.json()
  } catch {
    return []
  }
}

export const exportCSV = async (start?: string, end?: string): Promise<string> => {
  try {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    const res = await fetch(`${BASE_URL}/export/csv?${params.toString()}`)
    return await res.text()
  } catch {
    return ''
  }
}

export const getHistoryData = async (
  start: string,
  end: string,
  accounts: Account[]
): Promise<{ barData: HistoryData[]; lineData: HistoryData[] }> => {
  try {
    const params = new URLSearchParams()
    params.set('start', start)
    params.set('end', end)
    const res = await fetch(`${BASE_URL}/history?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      if (data.barData && data.lineData) {
        return { barData: data.barData, lineData: data.lineData }
      }
    }
  } catch {}
  return generateMockHistoryData(start, end, accounts)
}

const getMockAccounts = (): Account[] => [
  { id: 'acc_1', name: '微博官方号', platform: 'weibo', color: '#ff6b6b', icon: '📢' },
  { id: 'acc_2', name: '公众号专栏', platform: 'wechat', color: '#51cf66', icon: '💬' },
  { id: 'acc_3', name: '小红书笔记', platform: 'xiaohongshu', color: '#ff922b', icon: '📒' }
]

const getMockTasks = (): Task[] => {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const addDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return fmt(d)
  }
  return [
    {
      id: 'task_1',
      accountId: 'acc_1',
      title: '新品发布预告',
      type: 'short_text',
      summary: '明天上午10点新品首发，限时优惠不要错过，关注+转发抽3位送小样！',
      date: addDays(1),
      status: 'scheduled',
      estimatedViews: 15000,
      estimatedEngagement: 3.2
    },
    {
      id: 'task_2',
      accountId: 'acc_2',
      title: '深度产品评测报告',
      type: 'long_article',
      summary: '从用户角度深度体验产品30天，详细记录使用心得、优缺点对比，附真实场景图片展示。',
      date: addDays(2),
      status: 'draft',
      estimatedViews: 8000,
      estimatedEngagement: 4.5
    },
    {
      id: 'task_3',
      accountId: 'acc_3',
      title: '日常妆容分享',
      type: 'image_set',
      summary: '春日清新妆容教程，9张图详解每一步，附产品清单和色号推荐。',
      date: addDays(3),
      status: 'scheduled',
      estimatedViews: 25000,
      estimatedEngagement: 5.8
    },
    {
      id: 'task_4',
      accountId: 'acc_1',
      title: '用户故事征集',
      type: 'short_text',
      summary: '讲讲你和品牌的故事吧，被选中可获得全年产品免费使用权！',
      date: addDays(4),
      status: 'scheduled',
      estimatedViews: 20000,
      estimatedEngagement: 6.1
    },
    {
      id: 'task_5',
      accountId: 'acc_3',
      title: '开箱Vlog',
      type: 'video',
      summary: '网红爆款真的值得买吗？本期视频带你一次性测评5款热门产品。',
      date: addDays(5),
      status: 'draft',
      estimatedViews: 50000,
      estimatedEngagement: 7.2
    }
  ]
}

const generateMockHistoryData = (
  start: string,
  end: string,
  accounts: Account[]
): { barData: HistoryData[]; lineData: HistoryData[] } => {
  const barData: HistoryData[] = []
  const lineData: HistoryData[] = []
  const startDate = new Date(start)
  const endDate = new Date(end)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const barEntry: HistoryData = { date: dateStr }
    const lineEntry: HistoryData = { date: dateStr }
    accounts.forEach(acc => {
      barEntry[acc.id] = Math.floor(Math.random() * 5)
      const posts = (barEntry[acc.id] as number) || 1
      lineEntry[acc.id] = Number((2 + Math.random() * 8).toFixed(1))
      void posts
    })
    barData.push(barEntry)
    lineData.push(lineEntry)
  }
  return { barData, lineData }
}

export const contentTypeWidth: Record<ContentType, number> = {
  short_text: 60,
  long_article: 180,
  image_set: 120,
  video: 200
}

export const contentTypeLabel: Record<ContentType, string> = {
  short_text: '短文字',
  long_article: '长文章',
  image_set: '图片集',
  video: '视频'
}

export const platformIconMap: Record<Account['platform'], string> = {
  weibo: '📢',
  wechat: '💬',
  xiaohongshu: '📒'
}
