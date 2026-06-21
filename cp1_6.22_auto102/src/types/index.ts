export interface GraphNode {
  id: string;
  title: string;
  description: string;
  tags: string[];
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface Conflict {
  id: string;
  linkId: string;
  sourceId: string;
  targetId: string;
  ruleId: number;
  description: string;
}

export interface ConflictRule {
  id: number;
  keywordsA: string[];
  keywordsB: string[];
}

export type TagColor = '问题' | '方案' | '风险' | '机会' | '其他';

export const TAG_COLORS: Record<TagColor, string> = {
  '问题': '#e53e3e',
  '方案': '#38a169',
  '风险': '#dd6b20',
  '机会': '#3182ce',
  '其他': '#718096',
};

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 100;
