export interface Song {
  id: string
  title: string
  artist: string
  cover: string
  rank: number
}

export interface LyricLine {
  index: number
  text: string
}

export interface BlankSlot {
  position: number
  answer: string
}

export interface ChallengeLine {
  index: number
  original: string
  displayParts: string[]
  blanks: BlankSlot[]
}

export interface FillBlankChallenge {
  songId: string
  songTitle: string
  lines: ChallengeLine[]
}

export interface LineResult {
  lineIndex: number
  results: { blankIndex: number; correct: boolean; userAnswer: string; correctAnswer: string }[]
  lineScore: number
}

export interface Score {
  songId: string
  songTitle: string
  totalScore: number
  maxScore: number
  lineResults: LineResult[]
}

export interface ScoreRecord {
  id: string
  songId: string
  songTitle: string
  score: number
  maxScore: number
  timestamp: number
}
