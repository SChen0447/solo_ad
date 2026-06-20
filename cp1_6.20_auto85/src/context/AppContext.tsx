import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Position, Question, InterviewQA, ScoreResult } from '@/services/api';

export type InterviewPhase = 'idle' | 'ready' | 'active' | 'paused' | 'completed';

interface AppState {
  position: Position | null;
  phase: InterviewPhase;
  questions: Question[];
  currentIndex: number;
  answers: InterviewQA[];
  currentScore: ScoreResult | null;
  isSubmitting: boolean;
}

const initialState: AppState = {
  position: null,
  phase: 'idle',
  questions: [],
  currentIndex: 0,
  answers: [],
  currentScore: null,
  isSubmitting: false,
};

type Action =
  | { type: 'SELECT_POSITION'; payload: Position }
  | { type: 'SET_QUESTIONS'; payload: Question[] }
  | { type: 'START_INTERVIEW' }
  | { type: 'PAUSE_INTERVIEW' }
  | { type: 'RESUME_INTERVIEW' }
  | { type: 'SUBMIT_ANSWER_START' }
  | { type: 'SUBMIT_ANSWER_SUCCESS'; payload: InterviewQA }
  | { type: 'NEXT_QUESTION' }
  | { type: 'COMPLETE_INTERVIEW' }
  | { type: 'EXIT_INTERVIEW' }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_POSITION':
      return { ...state, position: action.payload, phase: 'ready' };
    case 'SET_QUESTIONS':
      return { ...state, questions: action.payload };
    case 'START_INTERVIEW':
      return { ...state, phase: 'active', currentIndex: 0, answers: [], currentScore: null };
    case 'PAUSE_INTERVIEW':
      return { ...state, phase: 'paused' };
    case 'RESUME_INTERVIEW':
      return { ...state, phase: 'active' };
    case 'SUBMIT_ANSWER_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_ANSWER_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        currentScore: action.payload.scores,
        answers: [...state.answers, action.payload],
      };
    case 'NEXT_QUESTION':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        currentScore: null,
      };
    case 'COMPLETE_INTERVIEW':
      return { ...state, phase: 'completed' };
    case 'EXIT_INTERVIEW':
      return { ...state, phase: 'idle', currentScore: null, isSubmitting: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
