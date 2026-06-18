import { create } from 'zustand';
import axios from 'axios';
import { Quiz, Submission, Question, QuizStats } from '../types';

interface QuizState {
  currentQuiz: Quiz | null;
  submissions: Submission[];
  quizStats: QuizStats | null;
  quizzes: Quiz[];
  loading: boolean;
  error: string | null;
  selectedStudent: Submission | null;

  createQuiz: (title: string, questions: Omit<Question, 'id'>[]) => Promise<Quiz | null>;
  fetchQuiz: (id: string) => Promise<void>;
  fetchQuizByCode: (code: string) => Promise<Quiz | null>;
  fetchQuizzes: () => Promise<void>;
  submitAnswers: (quizId: string, studentName: string, answers: { questionId: string; answer: string | string[] | boolean }[]) => Promise<Submission | null>;
  fetchSubmissions: (quizId: string) => Promise<void>;
  publishResults: (quizId: string) => Promise<void>;
  fetchStats: (quizId: string) => Promise<void>;
  setSelectedStudent: (student: Submission | null) => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  currentQuiz: null,
  submissions: [],
  quizStats: null,
  quizzes: [],
  loading: false,
  error: null,
  selectedStudent: null,

  createQuiz: async (title, questions) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/quizzes', { title, questions });
      const quiz = res.data as Quiz;
      set({ currentQuiz: quiz, loading: false });
      return quiz;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建测验失败', loading: false });
      return null;
    }
  },

  fetchQuiz: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/api/quizzes/${id}`);
      set({ currentQuiz: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取测验失败', loading: false });
    }
  },

  fetchQuizByCode: async (code) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/api/quizzes/code/${code}`);
      const quiz = res.data as Quiz;
      set({ currentQuiz: quiz, loading: false });
      return quiz;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '邀请码无效', loading: false });
      return null;
    }
  },

  fetchQuizzes: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/quizzes');
      set({ quizzes: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取测验列表失败', loading: false });
    }
  },

  submitAnswers: async (quizId, studentName, answers) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`/api/quizzes/${quizId}/submissions`, {
        studentName,
        answers,
      });
      set({ loading: false });
      return res.data as Submission;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '提交失败', loading: false });
      return null;
    }
  },

  fetchSubmissions: async (quizId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/api/quizzes/${quizId}/submissions`);
      set({ submissions: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取提交列表失败', loading: false });
    }
  },

  publishResults: async (quizId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`/api/quizzes/${quizId}/publish`);
      set({
        currentQuiz: res.data.quiz,
        submissions: res.data.submissions,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '公布结果失败', loading: false });
    }
  },

  fetchStats: async (quizId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/api/quizzes/${quizId}/stats`);
      set({ quizStats: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取统计数据失败', loading: false });
    }
  },

  setSelectedStudent: (student) => {
    set({ selectedStudent: student });
  },

  setCurrentQuiz: (quiz) => {
    set({ currentQuiz: quiz });
  },
}));
