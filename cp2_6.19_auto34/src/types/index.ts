export interface WordData {
  id: string;
  word: string;
  parts: string[];
  hint: string;
}

export interface DraggablePart {
  id: string;
  char: string;
  sourceIndex: number;
}

export interface GameState {
  currentWord: WordData;
  placedParts: DraggablePart[];
  isCorrect: boolean | null;
  availableParts: DraggablePart[];
}

export interface ScoreState {
  score: number;
  correctCount: number;
  totalCount: number;
  roundProgress: boolean[];
}

export interface GameResult {
  totalScore: number;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  timeSpent: number;
}
