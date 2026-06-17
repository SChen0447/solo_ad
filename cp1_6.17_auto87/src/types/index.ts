export interface TestCase {
  description: string;
  passed: boolean;
  input?: [number, number];
  expected?: number;
  actual?: number;
  error?: string;
}

export interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  code: string;
  score: number;
  test_cases: TestCase[];
  feedback: string;
  submitted_at: string;
}

export interface Comment {
  id: string;
  submission_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  latest_score: number | null;
  latest_submitted_at: string | null;
  submission_count: number;
}

export interface ScoreRangeData {
  range: string;
  count: number;
}

export interface HistoryPoint {
  index: number;
  score: number;
  submitted_at: string;
}
