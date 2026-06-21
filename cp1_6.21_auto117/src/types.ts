export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection';

export interface Word {
  id: string;
  english: string;
  chinese: string;
  example?: string;
  partOfSpeech: PartOfSpeech;
  createdAt: string;
}

export interface WordBank {
  id: string;
  name: string;
  description?: string;
  words: Word[];
  createdAt: string;
}

export type QuestionType = 'choice' | 'fill' | 'dictation';

export interface Question {
  id: string;
  type: QuestionType;
  wordId: string;
  word: Word;
  prompt: string;
  answer: string;
  options?: string[];
  points: number;
}

export interface TestConfig {
  questionCount: number;
  pointsPerQuestion: number;
  durationMinutes: number;
  questionTypes: QuestionType[];
}

export interface Test {
  id: string;
  wordBankId: string;
  wordBankName: string;
  name: string;
  config: TestConfig;
  code: string;
  questions: Question[];
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
}

export interface TestAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TestSubmission {
  testId: string;
  studentId: string;
  studentName: string;
  answers: TestAnswer[];
  totalScore: number;
  maxScore: number;
  timeSpent: number;
  submittedAt: string;
}

export interface ScoreRank {
  rank: number;
  studentId: string;
  studentName: string;
  totalScore: number;
  maxScore: number;
  timeSpent: number;
  submittedAt: string;
}

export interface DiagnosisDimension {
  dimension: string;
  score: number;
  fullMark: number;
}

export interface WrongQuestion {
  question: Question;
  studentAnswer: string;
  correctAnswer: string;
  type: QuestionType;
}

export interface DiagnosisReport {
  studentId: string;
  studentName: string;
  testId: string;
  testName: string;
  completedAt: string;
  timeSpent: number;
  totalScore: number;
  maxScore: number;
  dimensions: DiagnosisDimension[];
  wrongQuestions: WrongQuestion[];
}

export interface DataStore {
  wordbanks: WordBank[];
  tests: Test[];
  submissions: TestSubmission[];
}

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  preposition: '介词',
  conjunction: '连词',
  pronoun: '代词',
  interjection: '感叹词',
};

export const PART_OF_SPEECH_COLORS: Record<PartOfSpeech, string> = {
  noun: '#E3F2FD',
  verb: '#FCE4EC',
  adjective: '#E8F5E9',
  adverb: '#FFF3E0',
  preposition: '#F3E5F5',
  conjunction: '#E0F7FA',
  pronoun: '#FFF8E1',
  interjection: '#FFEBEE',
};

export const PART_OF_SPEECH_TEXT_COLORS: Record<PartOfSpeech, string> = {
  noun: '#1976D2',
  verb: '#C2185B',
  adjective: '#388E3C',
  adverb: '#F57C00',
  preposition: '#7B1FA2',
  conjunction: '#0097A7',
  pronoun: '#FBC02D',
  interjection: '#D32F2F',
};
