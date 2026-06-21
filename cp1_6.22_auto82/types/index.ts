export type MarkdownType = 'quiz' | 'chapter' | 'note';

export interface QuizOption {
  id: string;
  text: string;
}

export interface Markdown {
  id: string;
  type: MarkdownType;
  title: string;
  timestamp: number;
  question?: string;
  options?: QuizOption[];
  createdAt: number;
}
