import type {
  WordBank,
  Word,
  Test,
  TestConfig,
  DiagnosisReport,
  ScoreRank,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getWordBanks: () => request<WordBank[]>('/wordbanks'),

  createWordBank: (name: string, description?: string) =>
    request<WordBank>('/wordbanks', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  addWords: (bankId: string, words: Array<Partial<Word> & { english: string; chinese: string }>) =>
    request<{ words: Word[]; totalCount: number }>(`/wordbanks/${bankId}/words`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    }),

  createTest: (payload: { wordBankId: string; name: string; config: TestConfig }) =>
    request<Test>('/tests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTests: () =>
    request<Array<Test & { submissions: number }>>('/tests'),

  updateTestStatus: (id: string, status: Test['status']) =>
    request<Test>(`/tests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getTestByCode: (code: string) =>
    request<{
      id: string;
      name: string;
      wordBankName: string;
      config: TestConfig;
      code: string;
      questions: Array<Omit<Test['questions'][number], 'answer'>>;
      totalQuestions: number;
    }>(`/tests/${code}/code`),

  getTestScores: (id: string) =>
    request<{ test: Test; scores: ScoreRank[] }>(`/tests/${id}/scores`),

  submitTest: (payload: {
    testId: string;
    studentId: string;
    studentName: string;
    answers: Array<{ questionId: string; answer: string; timeSpent: number }>;
  }) =>
    request<{ submission: unknown; report: DiagnosisReport }>('/tests/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getScoresByStudent: (studentId: string) =>
    request<DiagnosisReport[]>(`/scores/${studentId}`),

  getSubmissionReport: (id: string) =>
    request<DiagnosisReport>(`/submission/${id}`),
};
