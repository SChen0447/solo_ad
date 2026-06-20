import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export interface User {
  id: number;
  username: string;
  role: 'teacher' | 'student';
}

export interface QuestionBank {
  id: number;
  name: string;
  subject: string;
  difficulty: string;
  created_by: number;
  total_questions: number;
  avg_difficulty: string;
  created_at: string;
}

export type QuestionType = 'single' | 'multiple' | 'fill';

export interface Question {
  id: number;
  bank_id: number;
  type: QuestionType;
  content: string;
  options: string[];
  answer: string | string[];
  explanation?: string;
  score: number;
  difficulty: '简单' | '中等' | '困难';
  knowledge_tags: string[];
  created_at?: string;
}

export interface ExamResultDetail {
  question_id: number;
  user_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  score: number;
  max_score: number;
  explanation?: string;
  knowledge_tags: string[];
}

export interface ExamSubmitResult {
  success: boolean;
  score: number;
  total_score: number;
  percentage: number;
  details: ExamResultDetail[];
}

export interface ClassStats {
  avg_score: number;
  max_score: number;
  min_score: number;
  pass_rate: number;
  total_exams: number;
  distribution: number[];
  segment_labels: string[];
}

export interface KnowledgeStat {
  tag: string;
  total: number;
  error_rate: number;
  correct_rate: number;
}

export interface WrongQuestionGroup {
  tag: string;
  questions: Question[];
}

export interface GeneratedExam {
  exam_id: number;
  questions: Question[];
  total_score: number;
  weak_tags_used: string[];
}

export interface PracticeQuestion {
  question: Question | null;
  answer: string | string[];
  explanation?: string;
}

export interface PracticeSubmitResult {
  is_correct: boolean;
  correct_answer: string | string[];
  explanation?: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ success: boolean; user: User; message?: string }>('/auth/login', { username, password }),
  register: (username: string, password: string, role: string = 'student') =>
    api.post<{ success: boolean; user: User; message?: string }>('/auth/register', { username, password, role }),
};

export const bankApi = {
  getAll: () => api.get<QuestionBank[]>('/banks'),
  create: (name: string, subject: string, difficulty: string, created_by: number) =>
    api.post<{ success: boolean; id: number }>('/banks', { name, subject, difficulty, created_by }),
  delete: (id: number) => api.delete<{ success: boolean }>(`/banks/${id}`),
  getQuestions: (bankId: number) => api.get<Question[]>(`/banks/${bankId}/questions`),
  addQuestion: (bankId: number, q: Partial<Question>) =>
    api.post<{ success: boolean; id: number }>(`/banks/${bankId}/questions`, q),
  batchAdd: (bankId: number, questions: Partial<Question>[]) =>
    api.post<{ success: boolean; count: number }>(`/banks/${bankId}/questions/batch`, { questions }),
  export: (bankId: number) => api.get(`/banks/${bankId}/export`),
  getKnowledgeTags: (bankId: number) => api.get<string[]>(`/knowledge-tags/${bankId}`),
};

export const questionApi = {
  delete: (id: number) => api.delete<{ success: boolean }>(`/questions/${id}`),
  batchDelete: (ids: number[]) =>
    api.post<{ success: boolean }>('/questions/batch-delete', { ids }),
};

export const examApi = {
  generate: (userId: number, bankId: number, count: number = 20) =>
    api.post<GeneratedExam>('/exam/generate', { user_id: userId, bank_id: bankId, count }),
  submit: (examId: number, userId: number, answers: Record<string, string | string[]>) =>
    api.post<ExamSubmitResult>('/exam/submit', { exam_id: examId, user_id: userId, answers }),
};

export const statsApi = {
  getClassStats: () => api.get<ClassStats>('/stats/class'),
  getKnowledgeStats: () => api.get<KnowledgeStat[]>('/stats/knowledge'),
};

export const practiceApi = {
  getRandom: (bankId: number, knowledgeTags: string[] = [], difficulty?: string, userId?: number) =>
    api.post<PracticeQuestion>('/practice/random', {
      bank_id: bankId,
      knowledge_tags: knowledgeTags,
      difficulty,
      user_id: userId,
    }),
  submit: (userId: number, questionId: number, userAnswer: string | string[]) =>
    api.post<PracticeSubmitResult>('/practice/submit', {
      user_id: userId,
      question_id: questionId,
      user_answer: userAnswer,
    }),
  getWrongQuestions: (userId: number) => api.get<WrongQuestionGroup[]>('/wrong-questions/' + userId),
};

export default api;
