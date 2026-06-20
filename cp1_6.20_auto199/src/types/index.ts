export interface User {
  id: string;
  name: string;
  color: string;
  joinedAt: string;
}

export type NoteDuration = 'quarter' | 'eighth' | 'half' | 'whole';
export type Accidental = 'sharp' | 'flat' | 'natural' | null;

export interface Note {
  id: string;
  measure: number;
  position: number;
  pitch: number;
  duration: NoteDuration;
  accidental: Accidental;
  x: number;
  y: number;
  updatedAt?: string;
  updatedBy?: string;
}

export type AnnotationShape = 'rectangle' | 'circle' | 'highlight';

export interface Annotation {
  id: string;
  shape: AnnotationShape;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  userId: string;
  userName: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ScoreVersion {
  id: string;
  name: string;
  notes: Note[];
  annotations: Annotation[];
  measures: number;
  createdAt: string;
  createdBy: string;
}

export interface Score {
  id: string;
  measures: number;
  notes: Note[];
  annotations: Annotation[];
  versions: ScoreVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface DiffItem {
  id: string;
  type: 'note_added' | 'note_removed' | 'note_modified' | 'annotation_added' | 'annotation_removed' | 'annotation_modified' | 'measure_changed';
  category: 'notes' | 'annotations' | 'structure';
  label: string;
  oldValue?: any;
  newValue?: any;
  measure?: number;
  children?: DiffItem[];
}

export interface DiffReport {
  items: DiffItem[];
  totalChanges: number;
}

export type ToolMode = 'select' | 'add_quarter' | 'add_eighth' | 'delete' | 'annotate_rect' | 'annotate_circle' | 'annotate_highlight';

export interface ConflictInfo {
  id: string;
  type: 'note' | 'annotation';
  x: number;
  y: number;
  timestamp: number;
}

export interface NotificationData {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}
