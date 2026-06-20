export interface TestCaseResult {
  id: number;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
}

export interface CodeWarning {
  line: number;
  message: string;
  type: 'error' | 'warning' | 'info';
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeout: boolean;
  executionTime: number;
  testCases?: TestCaseResult[];
  warnings?: CodeWarning[];
}

export interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  inputExample: string;
  outputExample: string;
  starterCode: string;
}

export interface Ranking {
  rank: number;
  userId: string;
  username: string;
  problemId: number;
  passRate: number;
  avgExecutionTime: number;
  codeLines: number;
}

export interface HistorySubmission {
  id: number;
  timestamp: string;
  code: string;
  passRate: number;
  executionTime: number;
}

export interface DiscussionMessage {
  id: number;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  isMine: boolean;
}

export interface UserInfo {
  userId: string;
  username: string;
}
