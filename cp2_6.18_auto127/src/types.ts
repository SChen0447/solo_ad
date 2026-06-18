export type AnnotationStatus = 'pending' | 'approved' | 'rejected';

export interface Annotation {
  id: string;
  imageId: string;
  x: number;
  y: number;
  number: number;
  author: string;
  comment: string;
  status: AnnotationStatus;
  createdAt: number;
}

export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: number;
}

export const STATUS_LABELS: Record<AnnotationStatus, string> = {
  pending: '待确认',
  approved: '已采纳',
  rejected: '已驳回',
};

export const STATUS_COLORS: Record<AnnotationStatus, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};
