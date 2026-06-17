export interface Card {
  id: string;
  title: string;
  content: string;
  url: string;
  summary: string;
  tags: string[];
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
  isNew?: boolean;
}

export interface Link {
  id: string;
  sourceCardId: string;
  targetCardId: string;
  label: string;
}

export interface TagNode {
  name: string;
  frequency: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

export interface TagRelation {
  source: string;
  target: string;
  weight: number;
}

export interface SearchFilter {
  keyword: string;
  tags: string[];
  dateFrom: number | null;
  dateTo: number | null;
}

export interface Point {
  x: number;
  y: number;
}
