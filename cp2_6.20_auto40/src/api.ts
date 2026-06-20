/* ============================================
 * API请求模块
 * 调用关系：被 main.tsx、App.tsx、所有页面组件调用
 * 数据流向：前端组件 → api函数 → 后端server.ts → 内存数据 → 返回前端
 * ============================================ */

import type { Activity, Equipment, Review, User, Achievement } from './types'

const BASE = '/api'

interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

const handle = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getUser: (): Promise<User> => fetch(`${BASE}/user`).then(handle),

  getActivities: (page = 1, limit = 20): Promise<ListResponse<Activity>> =>
    fetch(`${BASE}/activities?page=${page}&limit=${limit}`).then(handle),

  getActivity: (id: string): Promise<Activity> =>
    fetch(`${BASE}/activities/${id}`).then(handle),

  createActivity: (payload: Partial<Activity>): Promise<Activity> =>
    fetch(`${BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handle),

  registerActivity: (id: string): Promise<{ success: boolean; activity: Activity }> =>
    fetch(`${BASE}/activities/${id}/register`, { method: 'POST' }).then(handle),

  unregisterActivity: (id: string): Promise<{ success: boolean; activity: Activity }> =>
    fetch(`${BASE}/activities/${id}/unregister`, { method: 'POST' }).then(handle),

  getEquipment: (page = 1, limit = 20, category = 'all', search = ''): Promise<ListResponse<Equipment>> =>
    fetch(`${BASE}/equipment?page=${page}&limit=${limit}&category=${category}&search=${encodeURIComponent(search)}`).then(handle),

  borrowEquipment: (id: string, days: number): Promise<{ success: boolean; equipment: Equipment }> =>
    fetch(`${BASE}/equipment/${id}/borrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    }).then(handle),

  returnEquipment: (id: string): Promise<{ success: boolean; equipment: Equipment }> =>
    fetch(`${BASE}/equipment/${id}/return`, { method: 'POST' }).then(handle),

  getReviews: (activityId: string): Promise<Review[]> =>
    fetch(`${BASE}/reviews/${activityId}`).then(handle),

  createReview: (activityId: string, payload: { imageUrl?: string; content: string }): Promise<Review> =>
    fetch(`${BASE}/reviews/${activityId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handle),

  likeReview: (reviewId: string): Promise<{ success: boolean; review: Review }> =>
    fetch(`${BASE}/reviews/${reviewId}/like`, { method: 'POST' }).then(handle),

  getAchievements: (): Promise<Achievement[]> =>
    fetch(`${BASE}/achievements`).then(handle),

  getUserActivities: (): Promise<Activity[]> =>
    fetch(`${BASE}/user/activities`).then(handle)
}

export const loadInitialData = async () => {
  try {
    const [activities, equipment] = await Promise.all([
      api.getActivities(1, 20),
      api.getEquipment(1, 20)
    ])
    return { activities, equipment }
  } catch (e) {
    console.error('加载初始数据失败:', e)
    return { activities: { data: [], total: 0, page: 1, limit: 20 }, equipment: { data: [], total: 0, page: 1, limit: 20 } }
  }
}
