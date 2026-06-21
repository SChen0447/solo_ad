export interface Course {
  id: number
  name: string
  date: string
  duration: number
  maxSlots: number
  fee: number
  description: string
  coverImage: string
  createdAt: string
  enrolledCount: number
}

export interface CourseDetail extends Course {
  enrollments: Enrollment[]
  materials: MaterialItem[]
}

export interface Enrollment {
  id: number
  courseId: number
  name: string
  phone: string
  email: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  createdAt: string
}

export interface MaterialItem {
  id: number
  courseId: number
  name: string
  estimatedUsage: number
  unit: string
  totalQuantity?: number
  enrollCount?: number
}

export interface Stats {
  totalCourses: number
  totalEnrollments: number
  pendingMaterialKits: number
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
}

export const SKILL_COLORS: Record<SkillLevel, string> = {
  beginner: '#4CAF50',
  intermediate: '#FF8C42',
  advanced: '#E53935',
}
