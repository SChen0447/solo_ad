export type CardLabel = 'feature' | 'fix' | 'docs' | 'refactor' | 'chore';
export type ColumnStatus = 'pending' | 'reviewing' | 'merged';
export type EmojiType = '👍' | '❤️' | '😄';

export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  mentions: string[];
  reactions: Record<EmojiType, string[]>;
  codeSnippet?: CodeSnippet;
  createdAt: string;
}

export interface MergeRequestCard {
  id: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  labels: CardLabel[];
  creator: string;
  status: ColumnStatus;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterCriteria {
  labels: CardLabel[];
  creators: string[];
  keyword: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

export interface BannerMessage {
  id: string;
  text: string;
  from: ColumnStatus;
  to: ColumnStatus;
}

export interface KanbanState {
  cards: MergeRequestCard[];
  filters: FilterCriteria;
  toast: ToastMessage | null;
  banner: BannerMessage | null;
}

export const LABEL_COLORS: Record<CardLabel, string> = {
  feature: '#10b981',
  fix: '#ef4444',
  docs: '#3b82f6',
  refactor: '#a855f7',
  chore: '#6b7280',
};

export const LABEL_NAMES: Record<CardLabel, string> = {
  feature: '新功能',
  fix: 'Bug修复',
  docs: '文档',
  refactor: '重构',
  chore: '杂项',
};

export const COLUMN_CONFIG: Record<ColumnStatus, { title: string; color: string }> = {
  pending: { title: '待评审', color: '#f59e0b' },
  reviewing: { title: '评审中', color: '#3b82f6' },
  merged: { title: '已合并', color: '#10b981' },
};

export const ALL_LABELS: CardLabel[] = ['feature', 'fix', 'docs', 'refactor', 'chore'];
export const ALL_STATUSES: ColumnStatus[] = ['pending', 'reviewing', 'merged'];
export const EMOJIS: EmojiType[] = ['👍', '❤️', '😄'];
