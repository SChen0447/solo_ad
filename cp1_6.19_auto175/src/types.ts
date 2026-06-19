export interface PhaseScore {
  id: string
  phase: string
  score: number
  createdAt: string
}

export interface Reflection {
  id: string
  content: string
  createdAt: string
}

export interface Retrospective {
  id: string
  projectName: string
  phases: string[]
  date: string
  scores: PhaseScore[]
  reflections: Reflection[]
  createdAt: string
}

export interface Keyword {
  word: string
  count: number
}
