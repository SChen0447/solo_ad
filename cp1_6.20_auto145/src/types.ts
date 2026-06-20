export type QuestionType = 'single_choice' | 'multiple_choice' | 'rating' | 'text';

export interface BilingualText {
  zh: string;
  en: string;
}

export interface Option {
  id: string;
  label: BilingualText;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: BilingualText;
  description?: BilingualText;
  required: boolean;
  options?: Option[];
  maxRating?: number;
  placeholder?: BilingualText;
}

export interface Survey {
  id?: string;
  title: BilingualText;
  description: BilingualText;
  questions: Question[];
  status?: 'active' | 'closed' | 'expired' | 'deleted';
  created_at?: string;
  updated_at?: string;
  expires_at?: string | null;
  response_count?: number;
}

export type AnswerValue = string | number | string[] | null;

export interface SurveyResponse {
  id?: string;
  survey_id: string;
  answers: Record<string, AnswerValue>;
  respondent?: string;
  submitted_at?: string;
}

export interface ChoiceStatItem {
  count: number;
  label: BilingualText;
}

export interface RatingStatData {
  [key: string]: ChoiceStatItem;
  average?: number;
}

export interface TextStatData {
  texts: Array<{ content: string; submitted_at: string }>;
}

export interface QuestionStat {
  type: QuestionType;
  title: BilingualText;
  required: boolean;
  response_count: number;
  data: Record<string, ChoiceStatItem> | RatingStatData | TextStatData;
  average?: number;
}

export interface SurveyStats {
  survey_id: string;
  total_responses: number;
  question_stats: Record<string, QuestionStat>;
  submitted_at_list: string[];
  survey_status?: string;
}

export type Language = 'zh' | 'en';
