export interface User {
  email: string;
  token: string;
}

export interface Assignment {
  id: string;
  title: string;
  difficulty: number;
  deadline: string;
  description: string;
  example_input: string;
  example_output: string;
  input_format: string;
  output_format: string;
}

export interface TestResult {
  test_case: number;
  status: 'pending' | 'passed' | 'failed' | 'timeout' | 'error';
  input: string;
  expected: string;
  actual: string;
  error: string;
  passed: boolean;
  execution_time: number;
}

export interface StyleAnalysis {
  cyclomatic_complexity: number;
  total_lines: number;
  comment_ratio: number;
  pep8_violations: number;
  complexity_level: string;
}

export interface EvaluationResult {
  submission_id: string;
  score: number;
  max_score: number;
  test_results: TestResult[];
  style_analysis: StyleAnalysis;
  submitted_at: string;
  email?: string;
  assignment_id?: string;
}

export interface EvaluationProgress {
  test_case: number;
  total: number;
  status: string;
  passed: boolean;
  score: number;
  result: TestResult;
  user?: string;
  assignment_id?: string;
}

export interface Submission {
  submission_id: string;
  score: number;
  max_score: number;
  style_analysis: StyleAnalysis;
  submitted_at: string;
  assignment_id: string;
}

export interface SubmissionsResponse {
  submissions: Submission[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type PageType = 'login' | 'register' | 'assignments' | 'submission' | 'history';
