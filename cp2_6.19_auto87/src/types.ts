export interface PollOption {
  id: string
  text: string
  votes: number
  percentage?: string
}

export interface Poll {
  id: string
  title: string
  options: PollOption[]
  createdAt: number
  deadline?: number
  totalVotes: number
  isCreator: boolean
  hasVoted: boolean
  isEnded: boolean
}

export interface PollListItem {
  id: string
  title: string
  createdAt: number
  deadline?: number
  totalVotes: number
  status: 'active' | 'ended'
}

export interface CreatePollRequest {
  title: string
  options: string[]
  deadline?: string
}

export interface VoteRequest {
  optionId: string
}

export interface PollResults {
  options: PollOption[]
  totalVotes: number
  isEnded: boolean
}

export interface Notification {
  id: string
  type: 'success' | 'error'
  message: string
}
