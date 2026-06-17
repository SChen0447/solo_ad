export interface SafeQuestion {
  id: string;
  question: string;
  options: string[];
  tags: string[];
}

export interface FullQuestion extends SafeQuestion {
  correctIndex: number;
  explanation: string;
}

export interface ExamResponse {
  questions: SafeQuestion[];
  fullQuestions: FullQuestion[];
}

export interface GradeResult {
  id: string;
  question: string;
  options: string[];
  userAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  tags: string[];
}

export interface KnowledgeAnalysis {
  tag: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface GradeResponse {
  results: GradeResult[];
  score: number;
  correctCount: number;
  totalCount: number;
  knowledgeAnalysis: KnowledgeAnalysis[];
}

export async function getExam(): Promise<ExamResponse> {
  const res = await fetch('/api/exam');
  if (!res.ok) {
    throw new Error('获取题目失败');
  }
  return res.json();
}

export async function gradeExam(
  answers: (number | null)[],
  questions: FullQuestion[]
): Promise<GradeResponse> {
  const res = await fetch('/api/exam/grade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers, questions }),
  });
  if (!res.ok) {
    throw new Error('提交批改失败');
  }
  return res.json();
}
