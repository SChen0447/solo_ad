export interface VersionItem {
  id: string;
  versionNumber: string;
  fileName: string;
  originalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  uploadTime: Date;
}

export interface Annotation {
  id: string;
  shape: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  versionId: string;
}

export type CompareMode = 'opacity' | 'split';
