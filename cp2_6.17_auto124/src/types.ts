export type QuestionType = 'single' | 'multiple' | 'scale';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  order: number;
  options?: QuestionOption[];
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  status: 'active' | 'closed';
  createdAt: string;
}

export interface Answer {
  questionId: string;
  value: string | string[];
}

export interface SurveyResponse {
  id: string;
  questionnaireId: string;
  answers: Answer[];
  createdAt: string;
}
