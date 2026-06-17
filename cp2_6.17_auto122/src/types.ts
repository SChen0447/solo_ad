export type DiffLineType = 'add' | 'remove' | 'modify' | 'context';

export type ReviewRating = 'pass' | 'fail' | 'needs_review';

export interface DiffLine {
  lineNumber: number;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
  type: DiffLineType;
  blockStart?: boolean;
  blockEnd?: boolean;
  blockRange?: string;
}

export interface Review {
  id: string;
  lineNumber: number;
  rating: ReviewRating;
  comment: string;
  timestamp: number;
}

export type PopupPosition = 'right' | 'left' | 'top' | 'bottom';
