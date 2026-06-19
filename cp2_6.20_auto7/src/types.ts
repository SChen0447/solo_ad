export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface Poll {
  id: string
  title: string
  options: PollOption[]
  createdAt: number
  deadline?: number
  totalVotes: number
  isExpired: boolean
  hasVoted?: boolean
  userVote?: string
  creatorToken?: string
}

export interface CreatePollRequest {
  title: string
  options: string[]
  deadline?: string
}

export interface Notification {
  id: string
  type: 'success' | 'error'
  message: string
}
