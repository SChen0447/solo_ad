export enum EmotionType {
  HAPPY = 'happy',
  CALM = 'calm',
  SAD = 'sad',
  ANGRY = 'angry',
  EXCITED = 'excited',
  TIRED = 'tired',
  ANXIOUS = 'anxious'
}

export interface EmotionInfo {
  type: EmotionType
  emoji: string
  label: string
  colorStart: string
  colorEnd: string
}

export interface DayRecord {
  id: string
  date: string
  emotion: EmotionType
  memo?: string
}

export interface MonthData {
  year: number
  month: number
  days: DayRecord[]
}

export const EMOTIONS: Record<EmotionType, EmotionInfo> = {
  [EmotionType.HAPPY]: {
    type: EmotionType.HAPPY,
    emoji: '😊',
    label: '开心',
    colorStart: '#FFD93D',
    colorEnd: '#FF8C00'
  },
  [EmotionType.CALM]: {
    type: EmotionType.CALM,
    emoji: '😌',
    label: '平静',
    colorStart: '#74B9FF',
    colorEnd: '#00CEC9'
  },
  [EmotionType.SAD]: {
    type: EmotionType.SAD,
    emoji: '😢',
    label: '难过',
    colorStart: '#A29BFE',
    colorEnd: '#6C5CE7'
  },
  [EmotionType.ANGRY]: {
    type: EmotionType.ANGRY,
    emoji: '😠',
    label: '生气',
    colorStart: '#FF7675',
    colorEnd: '#D63031'
  },
  [EmotionType.EXCITED]: {
    type: EmotionType.EXCITED,
    emoji: '🤩',
    label: '兴奋',
    colorStart: '#FDCB6E',
    colorEnd: '#E17055'
  },
  [EmotionType.TIRED]: {
    type: EmotionType.TIRED,
    emoji: '😴',
    label: '疲惫',
    colorStart: '#B2BEC3',
    colorEnd: '#636E72'
  },
  [EmotionType.ANXIOUS]: {
    type: EmotionType.ANXIOUS,
    emoji: '😰',
    label: '焦虑',
    colorStart: '#81ECEC',
    colorEnd: '#00B894'
  }
}
