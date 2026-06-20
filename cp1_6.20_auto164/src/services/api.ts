import axios from 'axios';
import type {
  Question,
  QuizStartResponse,
  NextQuestionResponse,
  QuizResult,
  AdminStats,
  Department,
  Difficulty
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const quizApi = {
  startQuiz: (userId: number = 1, totalQuestions: number = 10) =>
    api.post<QuizStartResponse>('/quiz/start', { userId, totalQuestions })
      .then((res) => res.data),

  submitAnswer: (sessionId: string, questionId: number, answer: number) =>
    api.post<NextQuestionResponse>('/quiz/next', {
      sessionId,
      questionId,
      answer
    }).then((res) => res.data),

  getSession: (sessionId: string) =>
    api.get(`/quiz/${sessionId}`).then((res) => res.data)
};

export const resultsApi = {
  getResults: (sessionId: string) =>
    api.get<QuizResult>(`/results/${sessionId}`).then((res) => res.data),

  getWrongAnswers: (userId: number, tag?: string) =>
    api.get(`/wrong-answers/${userId}`, { params: tag ? { tag } : {} })
      .then((res) => res.data)
};

export const questionsApi = {
  getQuestions: (params?: { difficulty?: Difficulty; tag?: string; page?: number; pageSize?: number }) =>
    api.get('/questions', { params }).then((res) => res.data),

  getQuestion: (id: number) =>
    api.get<Question>(`/questions/${id}`).then((res) => res.data),

  createQuestion: (question: Partial<Question>) =>
    api.post('/questions', question).then((res) => res.data),

  updateQuestion: (id: number, question: Partial<Question>) =>
    api.put(`/questions/${id}`, question).then((res) => res.data),

  deleteQuestion: (id: number) =>
    api.delete(`/questions/${id}`).then((res) => res.data),

  batchImport: (questions: Partial<Question>[]) =>
    api.post('/questions/batch', { questions }).then((res) => res.data)
};

export const adminApi = {
  getStats: (department?: string) =>
    api.get<AdminStats>('/admin/stats', { params: department ? { department } : {} })
      .then((res) => res.data),

  getDepartments: () =>
    api.get<Department[]>('/departments').then((res) => res.data)
};

export default api;
