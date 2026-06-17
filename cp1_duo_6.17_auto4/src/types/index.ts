export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm' | 'surprised'

export const EMOTION_EMOJI: Record<EmotionType, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  calm: '😐',
  surprised: '😮'
}

export const EMOTION_LABEL: Record<EmotionType, string> = {
  happy: '高兴',
  sad: '悲伤',
  angry: '愤怒',
  calm: '平静',
  surprised: '惊喜'
}

export interface Note {
  id: string
  content: string
  type: 'text' | 'voice' | 'image'
  createdAt: string
  location?: string
  emotion: EmotionType
  imageUrl?: string
  voiceUrl?: string
  voiceDuration?: number
}

export interface CreateNoteRequest {
  content: string
  type: 'text' | 'voice' | 'image'
  location?: string
  image?: File
  voice?: File
}
