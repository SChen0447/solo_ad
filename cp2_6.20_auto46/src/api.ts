export type Condition = '全新' | '几乎全新' | '轻微使用痕迹' | '明显使用痕迹'

export interface ExchangeRequest {
  id: string
  requesterId: string
  requesterName: string
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface Item {
  id: string
  title: string
  description: string
  imageUrl: string
  condition: Condition
  ownerId: string
  ownerName: string
  exchangeRequests: ExchangeRequest[]
  createdAt: string
}

export interface Reply {
  id: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
}

export interface Answer {
  id: string
  content: string
  authorId: string
  authorName: string
  likes: number
  likedBy: string[]
  replies: Reply[]
  createdAt: string
}

export interface Question {
  id: string
  title: string
  content: string
  tags: string[]
  authorId: string
  authorName: string
  answers: Answer[]
  createdAt: string
}

export interface User {
  id: string
  name: string
  avatar: string
}

export interface ItemsResponse {
  items: Item[]
  total: number
  hasMore: boolean
}

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return await res.json() as T
  } catch (e) {
    console.error('[API Error]', path, e)
    throw e
  }
}

export function fetchItems(page = 1, pageSize = 12, userId?: string): Promise<ItemsResponse> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (userId) qs.set('userId', userId)
  return request<ItemsResponse>(`/items?${qs.toString()}`)
}

export function fetchItemById(id: string): Promise<Item> {
  return request<Item>(`/items/${id}`)
}

export function postItem(data: Partial<Item>): Promise<Item> {
  return request<Item>('/items', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteItem(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/items/${id}`, { method: 'DELETE' })
}

export function requestExchange(itemId: string, data: { requesterId: string; requesterName: string; message?: string }): Promise<ExchangeRequest> {
  return request<ExchangeRequest>(`/items/${itemId}/exchange`, { method: 'POST', body: JSON.stringify(data) })
}

export function fetchQuestions(tag?: string, userId?: string): Promise<Question[]> {
  const qs = new URLSearchParams()
  if (tag) qs.set('tag', tag)
  if (userId) qs.set('userId', userId)
  const q = qs.toString()
  return request<Question[]>(`/questions${q ? '?' + q : ''}`)
}

export function postQuestion(data: Partial<Question>): Promise<Question> {
  return request<Question>('/questions', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteQuestion(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE' })
}

export function postAnswer(questionId: string, data: { content: string; authorId: string; authorName: string }): Promise<Answer> {
  return request<Answer>(`/questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify(data) })
}

export function likeAnswer(answerId: string, userId: string): Promise<{ likes: number; liked: boolean }> {
  return request<{ likes: number; liked: boolean }>(`/answers/${answerId}/like`, { method: 'POST', body: JSON.stringify({ userId }) })
}

export function postReply(answerId: string, data: { content: string; authorId: string; authorName: string }): Promise<Reply> {
  return request<Reply>(`/answers/${answerId}/reply`, { method: 'POST', body: JSON.stringify(data) })
}

export function fetchUser(userId: string): Promise<User> {
  return request<User>(`/users/${userId}`)
}
