import type { Poll, CreatePollRequest } from './types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data as T
}

export const api = {
  createPoll: (body: CreatePollRequest) =>
    request<Poll>('/api/polls', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getPolls: () => request<Poll[]>('/api/polls'),

  getPoll: (id: string) => request<Poll>(`/api/polls/${id}`),

  vote: (id: string, optionId: string) =>
    request<Poll>(`/api/polls/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId })
    }),

  resetPoll: (id: string, creatorToken: string) =>
    request<Poll>(`/api/polls/${id}/reset`, {
      method: 'POST',
      body: JSON.stringify({ creatorToken })
    })
}
