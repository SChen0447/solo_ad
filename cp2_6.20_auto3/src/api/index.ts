import type { Activity, Comment } from '../types'

const API_BASE = '/api'

export const fetchActivities = async (): Promise<Activity[]> => {
  const response = await fetch(`${API_BASE}/activities`)
  if (!response.ok) throw new Error('获取活动列表失败')
  return response.json()
}

export const fetchActivity = async (id: string): Promise<Activity> => {
  const response = await fetch(`${API_BASE}/activities/${id}`)
  if (!response.ok) throw new Error('获取活动详情失败')
  return response.json()
}

export const createActivity = async (data: {
  title: string
  description: string
  time: number
  location: string
  maxParticipants: number
  type: string
}): Promise<Activity> => {
  const response = await fetch(`${API_BASE}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '创建活动失败')
  }
  return response.json()
}

export const registerActivity = async (
  activityId: string,
  userId: string
): Promise<{ activity: Activity; isRegistered: boolean }> => {
  const response = await fetch(`${API_BASE}/activities/${activityId}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '报名失败')
  }
  return response.json()
}

export const likeActivity = async (
  activityId: string,
  userId: string
): Promise<{ activity: Activity; isLiked: boolean }> => {
  const response = await fetch(`${API_BASE}/activities/${activityId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  if (!response.ok) throw new Error('点赞失败')
  return response.json()
}

export const addComment = async (
  activityId: string,
  userId: string,
  userName: string,
  content: string
): Promise<Comment> => {
  const response = await fetch(`${API_BASE}/activities/${activityId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName, content })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '评论失败')
  }
  return response.json()
}

export const fetchUserProfile = async (userId: string): Promise<{
  user: any
  registeredActivities: Activity[]
  likedActivities: Activity[]
}> => {
  const response = await fetch(`${API_BASE}/users/${userId}`)
  if (!response.ok) throw new Error('获取用户信息失败')
  return response.json()
}
