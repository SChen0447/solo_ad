export interface Problem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  template: string
}

export interface PracticeRecord {
  id: string
  problemId: string
  problemTitle: string
  code: string
  submittedAt: string
  success: boolean
  output: string
  error: string
}

export interface Stats {
  totalAttempts: number
  successfulAttempts: number
  successRate: number
  currentStreak: number
  uniqueDays: number
  problemStats: Array<{
    problemId: string
    title: string
    attempts: number
    success: number
  }>
}

export interface RunResult {
  success: boolean
  output: string
  error: string
  recordId: string
}
