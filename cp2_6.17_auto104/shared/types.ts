export interface Stage {
  id: string
  name: string
  description: string
  startTime: string
  votingOpen: boolean
  scores: number[]
  createdAt: number
}

export interface StageRatings {
  stageId: string
  stageName: string
  averageScore: number
  voteCount: number
  maxScore: number
}

export interface Comment {
  id: string
  stageId: string
  nickname: string
  content: string
  score: number
  avatarGradient: string
  createdAt: number
}

export interface CreateStageRequest {
  name: string
  description: string
  startTime: string
}

export interface VoteRequest {
  score: number
  seatNumber: string
}

export interface CreateCommentRequest {
  stageId: string
  nickname: string
  content: string
  score: number
}

export interface RatingsResponse {
  stages: StageRatings[]
}
