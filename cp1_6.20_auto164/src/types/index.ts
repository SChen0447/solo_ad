export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: number;
  content: string;
  options: string[];
  correctAnswer: number;
  difficulty: Difficulty;
  tags: string[];
  explanation: string;
  reviewSuggestion: string;
}

export interface QuizQuestion extends Question {
}

export interface WrongQuestion extends Question {
  userAnswer: number;
  answeredAt: string;
}

export interface TagStats {
  tag: string;
  totalCount: number;
  wrongCount: number;
  wrongRate: number;
}

export interface QuizSession {
  id: string;
  userId: number;
  currentDifficulty: Difficulty;
  consecutiveCorrect: number;
  consecutiveHardWrong: number;
  answers: Answer[];
}

export interface Answer {
  questionId: number;
  userAnswer: number;
  isCorrect: boolean;
  difficulty: Difficulty;
}

export interface QuizResult {
  sessionId: string;
  score: number;
  total: number;
  accuracy: number;
  wrongAnswers: WrongQuestion[];
  tags: TagStats[];
}

export interface AdminStats {
  completionRate: number;
  avgAccuracy: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface Department {
  id: number;
  name: string;
}

export interface QuizStartResponse {
  sessionId: string;
  firstQuestion: QuizQuestion;
  totalQuestions: number;
  currentDifficulty: Difficulty;
}

export interface NextQuestionResponse {
  isFinished: boolean;
  isCorrect: boolean;
  currentDifficulty: Difficulty;
  nextQuestion: QuizQuestion | null;
  answeredCount: number;
  score?: number;
  total?: number;
}

export interface EngineState {
  currentDifficulty: Difficulty;
  consecutiveCorrect: number;
  consecutiveHardWrong: number;
  answeredIds: number[];
}
