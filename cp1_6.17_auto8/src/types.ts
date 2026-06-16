export interface RiskClause {
  id: string;
  type: 'penalty' | 'termination' | 'disclaimer' | 'other';
  severity: 'low' | 'medium' | 'high';
  text: string;
  startIndex: number;
  endIndex: number;
  description: string;
  suggestion: string;
  legalBasis: string;
}

export interface Chapter {
  id: string;
  title: string;
  level: number;
  startIndex: number;
  endIndex: number;
  children: Chapter[];
  expanded?: boolean;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  chapters: Chapter[];
  risks: RiskClause[];
}

export interface ComplianceScore {
  total: number;
  legalBasis: number;
  fairness: number;
  precision: number;
  details: {
    legalBasis: string;
    fairness: string;
    precision: string;
  };
}

export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export type PanelMode = 'risk' | 'editor' | 'score';
