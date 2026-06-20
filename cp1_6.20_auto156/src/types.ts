export type MoodType = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'tired'

export interface MoodConfig {
  type: MoodType
  label: string
  color: string
  gradient: string
}

export const MOOD_CONFIGS: MoodConfig[] = [
  { type: 'happy', label: '开心', color: '#FFA62F', gradient: 'linear-gradient(to bottom, #FFA62F, #FFFFFF)' },
  { type: 'calm', label: '平静', color: '#4ECDC4', gradient: 'linear-gradient(to bottom, #4ECDC4, #FFFFFF)' },
  { type: 'anxious', label: '焦虑', color: '#9B59B6', gradient: 'linear-gradient(to bottom, #9B59B6, #FFFFFF)' },
  { type: 'sad', label: '忧伤', color: '#3498DB', gradient: 'linear-gradient(to bottom, #3498DB, #FFFFFF)' },
  { type: 'angry', label: '愤怒', color: '#E74C3C', gradient: 'linear-gradient(to bottom, #E74C3C, #FFFFFF)' },
  { type: 'tired', label: '疲惫', color: '#95A5A6', gradient: 'linear-gradient(to bottom, #95A5A6, #FFFFFF)' },
]

export const getMoodConfig = (type: MoodType): MoodConfig => {
  return MOOD_CONFIGS.find(m => m.type === type) || MOOD_CONFIGS[0]
}

export interface MoodCard {
  id: string
  mood: MoodType
  content: string
  memberId: string
  memberName: string
  keywords: string[]
  createdAt: string
}

export interface MoodCardNode extends MoodCard {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
}

export interface MoodDistribution {
  mood: MoodType
  count: number
  percentage: number
}

export interface IntensityDataPoint {
  time: string
  happy: number
  calm: number
  anxious: number
  sad: number
  angry: number
  tired: number
}

export interface MoodAggregate {
  distribution: MoodDistribution[]
  intensityHistory: IntensityDataPoint[]
  totalCount: number
}

export interface Member {
  id: string
  name: string
  avatar?: string
}
