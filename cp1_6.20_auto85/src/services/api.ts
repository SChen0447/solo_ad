import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export type Position = 'frontend' | 'backend' | 'pm' | 'data_analyst';

export interface Question {
  id: number;
  text: string;
}

export interface ScoreResult {
  scores: {
    technical_accuracy: number;
    logical_expression: number;
    completeness: number;
  };
  overall_score: number;
  feedback: {
    strengths: string;
    improvements: string;
  };
}

export interface InterviewQA {
  question: string;
  answer: string;
  scores: ScoreResult;
}

export interface InterviewRecord {
  id: string;
  date: string;
  position: Position;
  positionLabel: string;
  overallScore: number;
  questions: InterviewQA[];
}

export const POSITION_LABELS: Record<Position, string> = {
  frontend: '前端开发',
  backend: '后端开发',
  pm: '产品经理',
  data_analyst: '数据分析师',
};

export async function fetchQuestions(position: Position): Promise<Question[]> {
  const res = await axios.post<{ questions: Question[] }>(`${API_BASE}/questions`, { position });
  return res.data.questions;
}

export async function submitAnswer(
  questionId: number,
  answer: string,
  position: Position
): Promise<ScoreResult> {
  const res = await axios.post<ScoreResult>(`${API_BASE}/score`, {
    question_id: questionId,
    answer,
    position,
  });
  return res.data;
}

const STORAGE_KEY = 'interview_history';

export function loadHistory(): InterviewRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(record: InterviewRecord): void {
  const history = loadHistory();
  history.unshift(record);
  if (history.length > 10) history.length = 10;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
