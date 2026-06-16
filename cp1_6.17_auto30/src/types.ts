export interface FunctionParam {
  name: string;
  type: string;
}

export interface FunctionMeta {
  name: string;
  params: FunctionParam[];
  returnType: string;
  isExported: boolean;
  isDefaultExport: boolean;
  isClassMethod: boolean;
  className?: string;
  dependencies: string[];
}

export interface ParseResult {
  functions: FunctionMeta[];
  exports: string[];
  defaultExport: string | null;
}

export interface GenerateResult {
  testCode: string;
  functions: FunctionMeta[];
}

export interface CoverageReport {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export interface HistoryItem {
  id: string;
  code: string;
  testCode: string;
  timestamp: string;
  functions: FunctionMeta[];
}

export interface RunResult {
  passed: boolean;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
}
