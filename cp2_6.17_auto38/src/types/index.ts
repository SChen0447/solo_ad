export type DiffLineStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffLine {
  lineNumber: number;
  status: DiffLineStatus;
  text: string;
  leftText?: string;
  rightText?: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
}

export type SupportedLanguage = 'javascript' | 'typescript' | 'html' | 'css';

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
}

export interface BubbleState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}
