export type Emotion = 'happy' | 'sad' | 'anxious' | 'angry' | 'calm' | 'hopeful'

export interface MatchedSummary {
  id: string
  text: string
  emotion: Emotion
  timestamp: number
  likes: number
}

export interface Card {
  id: string
  text: string
  emotion: Emotion
  timestamp: number
  matchedSummaries: MatchedSummary[]
  matchCount: number
  liked?: boolean
}

export interface CreateCardRequest {
  text: string
  emotion: Emotion
}

export interface WSMessage {
  type: 'matched'
  cardId: string
  matchedSummaries: MatchedSummary[]
  matchCount: number
}

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: '快乐',
  sad: '悲伤',
  anxious: '焦虑',
  angry: '愤怒',
  calm: '平静',
  hopeful: '期待',
}

export const EMOTION_EMOJI: Record<Emotion, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  angry: '😠',
  calm: '😌',
  hopeful: '🤞',
}

export const EMOTION_SENTIMENT: Record<Emotion, 'positive' | 'negative' | 'neutral'> = {
  happy: 'positive',
  hopeful: 'positive',
  calm: 'neutral',
  sad: 'negative',
  anxious: 'negative',
  angry: 'negative',
}
