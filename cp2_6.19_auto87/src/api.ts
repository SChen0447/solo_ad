import type { Poll, PollListItem, CreatePollRequest, VoteRequest, PollOption, PollResults } from './types'

const API_BASE = '/api'

export const createPoll = async (data: CreatePollRequest): Promise<Poll> => {
  const response = await fetch(`${API_BASE}/polls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '创建投票失败')
  }

  return response.json()
}

export const getPolls = async (): Promise<PollListItem[]> => {
  const response = await fetch(`${API_BASE}/polls`)

  if (!response.ok) {
    throw new Error('获取投票列表失败')
  }

  return response.json()
}

export const getPoll = async (id: string): Promise<Poll> => {
  const response = await fetch(`${API_BASE}/polls/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('投票不存在')
    }
    throw new Error('获取投票详情失败')
  }

  return response.json()
}

export const submitVote = async (pollId: string, optionId: string): Promise<{ options: PollOption[], totalVotes: number }> => {
  const data: VoteRequest = { optionId }
  const response = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '投票失败')
  }

  return response.json()
}

export const resetPoll = async (pollId: string): Promise<{ options: PollOption[], totalVotes: number }> => {
  const response = await fetch(`${API_BASE}/polls/${pollId}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '重置投票失败')
  }

  return response.json()
}

export const getPollResults = async (pollId: string): Promise<PollResults> => {
  const response = await fetch(`${API_BASE}/polls/${pollId}/results`)

  if (!response.ok) {
    throw new Error('获取投票结果失败')
  }

  return response.json()
}
