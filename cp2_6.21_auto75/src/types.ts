export interface Poem {
  id: number
  title: string
  author: string
  dynasty: string
  content: string[]
  notes: string
}

export interface CardPosition {
  x: number
  y: number
  rotation: number
}

export interface CardState extends CardPosition {
  id: number
  poem: Poem
  opacity: number
  speed: number
  settled: boolean
  settledY: number
  scale: number
}

export interface Ripple {
  id: number
  x: number
  y: number
  start: number
}

export type DynastyOption = '' | '唐' | '宋' | '元' | '明' | '清'

export interface AppState {
  searchQuery: string
  selectedDynasty: DynastyOption
  isMusicPlaying: boolean
  expandedCardId: number | null
}
