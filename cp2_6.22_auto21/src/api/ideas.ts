export interface Idea {
  id: string
  title: string
  description: string
  author: string
  voteCount: number
  createdAt: string
  priority: 'high' | 'medium' | 'low'
}

export interface UserVotes {
  remainingVotes: number
  votedIdeas: string[]
}

export interface User {
  id: string
  name: string
}

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(data.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export function getIdeas(): Promise<Idea[]> {
  return request<Idea[]>('/ideas')
}

export function createIdea(data: { title: string; description: string; author: string }): Promise<Idea> {
  return request<Idea>('/ideas', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function voteForIdea(id: string, userId = 'default-user'): Promise<{ idea: Idea; remainingVotes: number }> {
  return request<{ idea: Idea; remainingVotes: number }>(`/ideas/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  })
}

export function getUserVotes(userId = 'default-user'): Promise<UserVotes> {
  return request<UserVotes>(`/user-votes?userId=${encodeURIComponent(userId)}`)
}

export function getRankedIdeas(): Promise<Idea[]> {
  return request<Idea[]>('/ideas/ranked')
}

export function updateIdeaPriority(id: string, priority: 'high' | 'medium' | 'low'): Promise<Idea> {
  return request<Idea>(`/ideas/${id}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority })
  })
}

export function getUsers(): Promise<User[]> {
  return request<User[]>('/users')
}
