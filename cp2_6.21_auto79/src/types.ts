export type MaterialType = 'PNG' | 'GIF';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  mimeType: string;
  data: string;
  uploadedAt: number;
  annotationCount?: number;
}

export interface Annotation {
  id: string;
  materialId: string;
  x: number;
  y: number;
  color: string;
  text: string;
  author: string;
  createdAt: number;
}
