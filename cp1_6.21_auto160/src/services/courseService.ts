import type { Course, CourseDetail, Enrollment, MaterialItem, Stats } from '@/types'

const API_BASE = '/api'

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses`)
  if (!res.ok) throw new Error('Failed to fetch courses')
  return res.json()
}

export async function fetchCourseById(id: number): Promise<CourseDetail> {
  const res = await fetch(`${API_BASE}/courses/${id}`)
  if (!res.ok) throw new Error('Failed to fetch course')
  return res.json()
}

export async function createCourse(data: {
  name: string
  date: string
  duration: number
  maxSlots: number
  fee: number
  description: string
  coverImage: string
  materials?: { name: string; estimatedUsage: number; unit: string }[]
}): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create course')
  return res.json()
}

export async function createEnrollment(data: {
  courseId: number
  name: string
  phone: string
  email: string
  skillLevel: string
}): Promise<Enrollment> {
  const res = await fetch(`${API_BASE}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to enroll')
  }
  return res.json()
}

export async function deleteEnrollment(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/enrollments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete enrollment')
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function fetchMaterials(courseId: number): Promise<MaterialItem[]> {
  const res = await fetch(`${API_BASE}/materials/${courseId}`)
  if (!res.ok) throw new Error('Failed to fetch materials')
  return res.json()
}

export function getExportCsvUrl(courseId: number): string {
  return `${API_BASE}/export-csv/${courseId}`
}
