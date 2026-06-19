export type TagType = 'div' | 'button' | 'img' | 'nav' | 'header' | 'section' | 'footer' | 'article' | 'aside';

export interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  componentName: string;
  parentName: string;
  tagType: TagType;
  createdAt: number;
}

export interface HistoryState {
  past: Annotation[][];
  present: Annotation[];
  future: Annotation[][];
}

export type HistoryAction =
  | { type: 'ADD'; payload: Annotation }
  | { type: 'UPDATE'; payload: Annotation }
  | { type: 'DELETE'; payload: string }
  | { type: 'BATCH_SET'; payload: Annotation[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface ExportPayload {
  exportId: string;
  timestamp: number;
  exportedAt: string;
  image: {
    url: string | null;
    name: string | null;
  };
  statistics: {
    totalAnnotations: number;
    uniqueComponents: number;
    uniqueParents: number;
  };
  annotations: Array<{
    id: string;
    position: { x: number; y: number; width: number; height: number };
    size: { width: number; height: number };
    componentName: string;
    parentName: string;
    tagType: TagType;
    createdAt: number;
  }>;
}
