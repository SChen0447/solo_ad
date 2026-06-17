export type Language = 'javascript' | 'python' | 'html';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface CodeBlockData {
  id: string;
  language: Language;
  code: string;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  codeBlocks: CodeBlockData[];
  createdAt: number;
  updatedAt: number;
}

export interface DocumentListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
