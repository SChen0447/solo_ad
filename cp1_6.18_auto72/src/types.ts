export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export type AnnotationType = 'circle' | 'arrow';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  radius?: number;
  endX?: number;
  endY?: number;
  comments: Comment[];
  createdAt: number;
}

export interface Design {
  id: string;
  name: string;
  imageUrl: string;
  imageData?: string;
  annotations: Annotation[];
  createdAt: number;
}

export interface DesignListItem {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: number;
  commentCount: number;
}
