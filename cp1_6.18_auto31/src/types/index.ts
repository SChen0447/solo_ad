export interface Card {
  id: string
  title: string
  description: string
  urgency: number
  importance: number
  x: number
  y: number
  votes: number
  createdAt: number
}

export interface Comment {
  id: string
  cardId: string
  author: string
  content: string
  createdAt: number
}

export type Quadrant = 'important-urgent' | 'important-not-urgent' | 'not-important-urgent' | 'not-important-not-urgent'

export function getQuadrant(urgency: number, importance: number): Quadrant {
  const isImportant = importance > 3
  const isUrgent = urgency > 3
  if (isImportant && isUrgent) return 'important-urgent'
  if (isImportant && !isUrgent) return 'important-not-urgent'
  if (!isImportant && isUrgent) return 'not-important-urgent'
  return 'not-important-not-urgent'
}
