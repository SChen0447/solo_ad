export type QuestionType = 'single' | 'multiple' | 'fill';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  knowledge: string;
  difficulty: Difficulty;
}

export interface AnswerDetail {
  questionId: string;
  userAnswer: string | string[] | null;
  correctAnswer: string | string[];
  isCorrect: boolean;
  score: number;
}

export interface ScoreResult {
  totalScore: number;
  percentage: number;
  details: AnswerDetail[];
  knowledgeStats: Record<string, { correct: number; total: number; percentage: number }>;
}

export interface QuizRecord {
  id: string;
  createdAt: number;
  questions: Question[];
  answers: Record<string, string | string[] | null>;
  scoreResult?: ScoreResult;
  title: string;
}

export type UserRole = 'teacher' | 'student';

export type PageType = 'bank' | 'generate' | 'answer' | 'history';
