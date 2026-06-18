import { create } from 'zustand';
import { Question, AnswerRecord, QuizResult, ViewMode } from './types';

interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: AnswerRecord[];
  results: QuizResult[];
  viewMode: ViewMode;
  studentName: string;
  currentResult: QuizResult | null;
  questionStartTime: number;
  
  setViewMode: (mode: ViewMode) => void;
  setStudentName: (name: string) => void;
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  
  startQuiz: () => void;
  submitAnswer: (questionId: string, answer: number | string[] | number[], isCorrect: boolean) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  
  setCurrentResult: (result: QuizResult | null) => void;
  setResults: (results: QuizResult[]) => void;
  
  startQuestionTimer: () => void;
  getQuestionTimeSpent: () => number;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  results: [],
  viewMode: 'answer',
  studentName: '',
  currentResult: null,
  questionStartTime: 0,

  setViewMode: (mode) => set({ viewMode: mode }),
  setStudentName: (name) => set({ studentName: name }),
  setQuestions: (questions) => set({ questions }),
  addQuestion: (question) => set((state) => ({ questions: [...state.questions, question] })),
  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map(q => 
      q.id === id ? { ...q, ...updates } as Question : q
    )
  })),
  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter(q => q.id !== id)
  })),

  startQuiz: () => set({ 
    currentQuestionIndex: 0, 
    answers: [],
    questionStartTime: Date.now()
  }),

  submitAnswer: (questionId, answer, isCorrect) => {
    const state = get();
    const timeSpent = Math.floor((Date.now() - state.questionStartTime) / 1000);
    const record: AnswerRecord = {
      questionId,
      userAnswer: answer,
      isCorrect,
      timeSpent
    };
    set((state) => ({
      answers: [...state.answers.filter(a => a.questionId !== questionId), record]
    }));
  },

  nextQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1),
      questionStartTime: Date.now()
    }));
  },

  prevQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
      questionStartTime: Date.now()
    }));
  },

  setCurrentResult: (result) => set({ currentResult: result }),
  setResults: (results) => set({ results }),

  startQuestionTimer: () => set({ questionStartTime: Date.now() }),
  getQuestionTimeSpent: () => {
    return Math.floor((Date.now() - get().questionStartTime) / 1000);
  }
}));
