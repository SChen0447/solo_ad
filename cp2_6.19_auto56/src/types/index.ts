export interface User {
  id: string
  nickname: string
  role: 'teacher' | 'student'
  roomId: string
}

export interface Room {
  id: string
  name: string
  teacherId: string
  users: Map<string, User>
  keywords: KeywordWeight[]
  createdAt: number
}

export interface KeywordMessage {
  id: string
  roomId: string
  userId: string
  nickname: string
  keyword: string
  timestamp: number
}

export interface KeywordWeight {
  word: string
  weight: number
  lastUpdated: number
}

export interface WordPosition {
  word: string
  weight: number
  x: number
  y: number
  fontSize: number
  color: string
  rotate: number
}

export interface RenderData {
  positions: WordPosition[]
  width: number
  height: number
}

export interface Theme {
  id: string
  name: string
  primary: string
  background: string
  canvasBackground: string
  textColors: string[]
  accent: string
}

export type ThemeId = 'ocean' | 'forest' | 'sunset' | 'sakura' | 'dark'

export type RoomEventMap = {
  'keyword:submit': KeywordMessage
  'keyword:broadcast': KeywordWeight[]
  'user:join': User
  'user:leave': User
  'room:clear': void
}

export type WordCloudEventMap = {
  'data:update': RenderData
}
