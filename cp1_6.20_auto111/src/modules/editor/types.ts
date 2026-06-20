export type Language = 'javascript' | 'python' | 'html' | 'typescript';

export type Theme = 'vs-dark' | 'monokai' | 'light';

export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: Language;
  theme: Theme;
  createdAt: number;
  updatedAt: number;
  author: User;
  lastEditor?: User;
  likes: number;
  isLiked: boolean;
  isFavorited: boolean;
  shortUrl: string;
}

export type EditOperationType = 'insert' | 'delete' | 'replace';

export interface EditOperation {
  type: EditOperationType;
  position: number;
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export interface CollaboratorCursor {
  userId: string;
  user: User;
  position: number;
  color: string;
}

export const LANGUAGE_COLORS: Record<Language, string> = {
  javascript: '#f7df1e',
  python: '#3572a5',
  html: '#e34c26',
  typescript: '#3178c6',
};

export const CURSOR_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

export const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71'];

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  html: 'HTML/CSS',
  typescript: 'TypeScript',
};

export const THEME_LABELS: Record<Theme, string> = {
  'vs-dark': 'VS Dark',
  monokai: 'Monokai',
  light: 'Light',
};
