import type {
  Stage,
  Comment,
  CreateStageRequest,
  VoteRequest,
  CreateCommentRequest,
  RatingsResponse,
} from '../../shared/types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  getStages: () => request<Stage[]>('/stages'),

  createStage: (data: CreateStageRequest) =>
    request<Stage>('/stages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleStage: (id: string) =>
    request<Stage>(`/stages/${id}/toggle`, { method: 'POST' }),

  voteStage: (id: string, data: VoteRequest) =>
    request<{ success: boolean; message: string }>(`/stages/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRatings: () => request<RatingsResponse>('/ratings'),

  getComments: (stageId?: string) => {
    const query = stageId ? `?stageId=${stageId}` : ''
    return request<Comment[]>(`/comments${query}`)
  },

  createComment: (data: CreateCommentRequest) =>
    request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
