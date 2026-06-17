import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

export interface PoemInfo {
  id: number;
  title: string;
  author: string;
  dynasty: string;
  background: string;
  keywords: string[];
  cultural_note: string;
}

export interface BattleResult {
  success: boolean;
  message: string;
  session_id: string;
  next_line?: string;
  poem?: PoemInfo;
  is_classic?: boolean;
  score: number;
  combo: number;
  max_combo: number;
  earned_points?: number;
  difficulty: string;
  difficulty_name: string;
  best_score: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  user_line: string;
  ai_line: string | null;
  success: boolean;
  score: number;
  combo: number;
  poem?: PoemInfo;
  is_classic?: boolean;
}

export interface ScoreInfo {
  session_id: string;
  score: number;
  combo: number;
  max_combo: number;
  best_score: number;
  difficulty: string;
  difficulty_name: string;
  history_count?: number;
  history?: HistoryItem[];
}

export interface HintResult {
  success: boolean;
  message: string;
  hint?: string;
  session_id: string;
}

export interface HistoryResponse {
  session_id: string;
  history: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export const battleAPI = {
  submitLine: (line: string, sessionId?: string): Promise<BattleResult> => {
    return api.post('/battle', { line, session_id: sessionId }).then(res => res.data);
  },

  getHint: (line: string, sessionId?: string): Promise<HintResult> => {
    return api.post('/hint', { line, session_id: sessionId }).then(res => res.data);
  },

  getScore: (sessionId?: string): Promise<ScoreInfo> => {
    return api.get('/score', { params: { session_id: sessionId } }).then(res => res.data);
  },

  resetScore: (sessionId?: string): Promise<ScoreInfo> => {
    return api.post('/score', { action: 'reset', session_id: sessionId }).then(res => res.data);
  },

  getHistory: (sessionId?: string, page = 1, pageSize = 50): Promise<HistoryResponse> => {
    return api.get('/history', {
      params: { session_id: sessionId, page, page_size: pageSize }
    }).then(res => res.data);
  },

  searchPoems: (keyword: string): Promise<{ results: PoemInfo[]; count: number }> => {
    return api.get('/search', { params: { keyword } }).then(res => res.data);
  },

  getStats: (): Promise<any> => {
    return api.get('/stats').then(res => res.data);
  },
};

export default battleAPI;
