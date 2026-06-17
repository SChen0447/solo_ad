import axios from 'axios'
import type { Material, Schedule, PlatformType } from './context/AppContext'

export const PLATFORM_LIMITS: Record<PlatformType, number> = {
  weibo: 140,
  xiaohongshu: 1000,
  wechat: 5000,
}

export const PLATFORM_NAMES: Record<PlatformType, string> = {
  weibo: '微博',
  xiaohongshu: '小红书',
  wechat: '公众号',
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data?.message || error.message)
    return Promise.reject(new Error(error.response?.data?.message || '请求失败'))
  }
)

const mockDelay = <T,>(data: T, ms = 300): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), ms))

const uid = () => Math.random().toString(36).slice(2, 10)

const now = () => new Date().toISOString()

let mockMaterials: Material[] = [
  {
    id: 'm1',
    title: '新品发布：夏日限定系列',
    content: '今天为大家带来我们全新的夏日限定系列产品！轻薄透气的面料，清新自然的配色，让你在这个夏天成为最亮眼的存在。现在下单还有专属优惠，前100名额外赠送精美礼品一份～ 点击链接了解更多详情，数量有限先到先得！',
    coverImage: '',
    images: [],
    tags: ['2'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'm2',
    title: '618大促活动预热',
    content: '一年一度的618购物节即将到来！我们为大家准备了超值福利：全场低至5折，满减优惠券叠加使用，更有神秘大礼等你抽取。关注我们，第一时间获取活动信息，千万不要错过这次购物盛宴！',
    coverImage: '',
    images: [],
    tags: ['1'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'm3',
    title: '品牌故事：十年匠心路',
    content: '从一家小小的工作室，到如今被千万用户喜爱的品牌。这十年，我们坚持初心，用心做好每一件产品。感谢每一位陪伴我们成长的用户，未来的路，我们继续同行。',
    coverImage: '',
    images: [],
    tags: ['3'],
    createdAt: now(),
    updatedAt: now(),
  },
]

const getMockDate = (daysOffset: number, hour: number, minute: number = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

let mockSchedules: Schedule[] = [
  { id: 's1', materialId: 'm1', platform: 'weibo', publishTime: getMockDate(1, 10, 0), status: 'pending', orderIndex: 0 },
  { id: 's2', materialId: 'm1', platform: 'xiaohongshu', publishTime: getMockDate(1, 12, 0), status: 'pending', orderIndex: 1 },
  { id: 's3', materialId: 'm1', platform: 'wechat', publishTime: getMockDate(2, 9, 0), status: 'draft', orderIndex: 0 },
  { id: 's4', materialId: 'm2', platform: 'weibo', publishTime: getMockDate(3, 20, 0), status: 'pending', orderIndex: 0 },
  { id: 's5', materialId: 'm3', platform: 'wechat', publishTime: getMockDate(-1, 18, 0), status: 'published', orderIndex: 0 },
]

export async function fetchMaterials(): Promise<Material[]> {
  try {
    const res = await api.get<Material[]>('/materials')
    return res.data
  } catch {
    return mockDelay(mockMaterials)
  }
}

export async function fetchMaterial(id: string): Promise<Material> {
  try {
    const res = await api.get<Material>(`/materials/${id}`)
    return res.data
  } catch {
    const m = mockMaterials.find(x => x.id === id)
    if (!m) throw new Error('素材不存在')
    return mockDelay(m)
  }
}

export async function createMaterial(data: Partial<Material>): Promise<Material> {
  try {
    const res = await api.post<Material>('/materials', data)
    return res.data
  } catch {
    const newMaterial: Material = {
      id: uid(),
      title: data.title || '',
      content: data.content || '',
      coverImage: data.coverImage || '',
      images: data.images || [],
      tags: data.tags || [],
      createdAt: now(),
      updatedAt: now(),
    }
    mockMaterials = [newMaterial, ...mockMaterials]
    return mockDelay(newMaterial)
  }
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
  try {
    const res = await api.put<Material>(`/materials/${id}`, data)
    return res.data
  } catch {
    mockMaterials = mockMaterials.map(m =>
      m.id === id ? { ...m, ...data, updatedAt: now() } : m
    )
    const m = mockMaterials.find(x => x.id === id)
    if (!m) throw new Error('素材不存在')
    return mockDelay(m)
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    await api.delete(`/materials/${id}`)
  } catch {
    mockMaterials = mockMaterials.filter(m => m.id !== id)
    mockSchedules = mockSchedules.filter(s => s.materialId !== id)
    return mockDelay(undefined)
  }
}

export async function fetchSchedules(): Promise<Schedule[]> {
  try {
    const res = await api.get<Schedule[]>('/schedules')
    return res.data
  } catch {
    const enriched = mockSchedules.map(s => ({
      ...s,
      material: mockMaterials.find(m => m.id === s.materialId),
    }))
    return mockDelay(enriched as Schedule[])
  }
}

export async function createSchedule(data: Partial<Schedule>): Promise<Schedule> {
  try {
    const res = await api.post<Schedule>('/schedules', data)
    return res.data
  } catch {
    const newSchedule: Schedule = {
      id: uid(),
      materialId: data.materialId || '',
      platform: data.platform || 'weibo',
      publishTime: data.publishTime || now(),
      status: data.status || 'draft',
      orderIndex: data.orderIndex ?? mockSchedules.length,
    }
    mockSchedules = [...mockSchedules, newSchedule]
    return mockDelay(newSchedule)
  }
}

export async function updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
  try {
    const res = await api.put<Schedule>(`/schedules/${id}`, data)
    return res.data
  } catch {
    mockSchedules = mockSchedules.map(s =>
      s.id === id ? { ...s, ...data } : s
    )
    const s = mockSchedules.find(x => x.id === id)
    if (!s) throw new Error('排期不存在')
    return mockDelay(s)
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  try {
    await api.delete(`/schedules/${id}`)
  } catch {
    mockSchedules = mockSchedules.filter(s => s.id !== id)
    return mockDelay(undefined)
  }
}

export interface PlatformValidationResult {
  platform: PlatformType
  valid: boolean
  charCount: number
  limit: number
  overflow: number
  truncateIndex?: number
}

export async function validatePlatformContent(
  content: string,
  platform: PlatformType
): Promise<PlatformValidationResult> {
  try {
    const res = await api.post<PlatformValidationResult>(`/platform/validate`, { content, platform })
    return res.data
  } catch {
    const limit = PLATFORM_LIMITS[platform]
    const charCount = content.length
    const valid = charCount <= limit
    const overflow = Math.max(0, charCount - limit)
    return mockDelay({
      platform,
      valid,
      charCount,
      limit,
      overflow,
      truncateIndex: valid ? undefined : limit,
    })
  }
}

export async function validateAllPlatforms(content: string): Promise<PlatformValidationResult[]> {
  return Promise.all([
    validatePlatformContent(content, 'weibo'),
    validatePlatformContent(content, 'xiaohongshu'),
    validatePlatformContent(content, 'wechat'),
  ])
}
