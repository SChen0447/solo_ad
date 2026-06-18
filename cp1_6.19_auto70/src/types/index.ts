export type AnnotationStatus = 'pending' | 'in-progress' | 'completed'

export interface DesignImage {
  id: string
  url: string
  naturalWidth: number
  naturalHeight: number
  fileName: string
  uploadedAt: number
}

export interface Annotation {
  id: string
  imageId: string
  x: number
  y: number
  radius: number
  content: string
  status: AnnotationStatus
  createdAt: number
  updatedAt: number
}

export interface Reply {
  id: string
  annotationId: string
  content: string
  createdAt: number
}

export const STATUS_COLORS: Record<AnnotationStatus, string> = {
  pending: '#FF6B35',
  'in-progress': '#4B7BEC',
  completed: '#20BF6B',
}

export const STATUS_LABELS: Record<AnnotationStatus, string> = {
  pending: '待处理',
  'in-progress': '处理中',
  completed: '已完成',
}
