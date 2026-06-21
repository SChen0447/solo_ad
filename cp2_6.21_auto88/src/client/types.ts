export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Card {
  id: string
  name: string
  rarity: Rarity
  attack: number
  defense: number
  imageUrl: string
}

export interface CardsResponse {
  cards: Card[]
  total: number
  page: number
  pageSize: number
}

export interface Stats {
  player1Wins: number
  player2Wins: number
  draws: number
  cardUsage: Record<string, number>
}

export interface BattleRequest {
  player1Cards: string[]
  player2Cards: string[]
  winner: 'player1' | 'player2' | 'draw'
}

export interface BattleResponse {
  success: boolean
  record?: BattleRecord
}

export interface BattleRecord {
  id: string
  player1Cards: string[]
  player2Cards: string[]
  winner: 'player1' | 'player2' | 'draw'
  timestamp: number
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
}

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
}
