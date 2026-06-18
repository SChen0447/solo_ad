export type Urgency = 'high' | 'medium' | 'low'
export type Energy = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  estimatedMinutes: number
  dueDate: string
  urgency: Urgency
  energy: Energy
  scheduledStart?: number
}

export interface ScheduleSuggestion {
  taskId: string
  startTime: number
}
