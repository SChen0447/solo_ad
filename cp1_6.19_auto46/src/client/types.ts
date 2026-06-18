export type QuestionType = 'choice' | 'fill' | 'sort';

export interface ChoiceQuestion {
  id: string;
  type: 'choice';
  title: string;
  options: string[];
  correctAnswer: number;
}

export interface FillQuestion {
  id: string;
  type: 'fill';
  title: string;
  blanks: string[];
}

export interface SortQuestion {
  id: string;
  type: 'sort';
  title: string;
  items: string[];
  correctOrder: number[];
}

export type Question = ChoiceQuestion | FillQuestion | SortQuestion;

export interface AnswerRecord {
  questionId: string;
  userAnswer: number | string[] | number[];
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizResult {
  id: string;
  studentName: string;
  answers: AnswerRecord[];
  totalScore: number;
  totalTime: number;
  createdAt: string;
}

export type ViewMode = 'editor' | 'answer' | 'analytics';
