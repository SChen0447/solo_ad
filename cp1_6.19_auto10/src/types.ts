export type QuestionType = 'single' | 'multiple' | 'fill' | 'judge';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string | string[] | boolean;
  score: number;
}

export interface Quiz {
  id: string;
  code: string;
  title: string;
  questions: Question[];
  createdAt: string;
  isPublished: boolean;
}

export interface StudentAnswer {
  questionId: string;
  answer: string | string[] | boolean;
}

export interface Submission {
  id: string;
  quizId: string;
  studentName: string;
  answers: StudentAnswer[];
  submittedAt: string;
  totalScore?: number;
  correctCount?: number;
  questionResults?: QuestionResult[];
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string | string[] | boolean;
  correctAnswer: string | string[] | boolean;
  score: number;
  earnedScore: number;
}

export interface QuizStats {
  questionStats: {
    questionId: string;
    questionContent: string;
    correctRate: number;
    correctCount: number;
    totalCount: number;
  }[];
}
