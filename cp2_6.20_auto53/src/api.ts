export interface Course {
  id: string
  title: string
  type: string
  date: string
  time: string
  maxStudents: number
  enrolledStudents: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  materials: string[]
  description: string
  colorIndex: number
}

export interface FeedbackItem {
  id: string
  courseId: string
  userId: string
  rating: number
  comment: string
  createdAt: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  condition: number
  unlocked: boolean
}

const BASE = '/api'

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${BASE}/courses`)
  return res.json()
}

export async function fetchCourse(id: string): Promise<Course> {
  const res = await fetch(`${BASE}/courses/${id}`)
  return res.json()
}

export async function signUp(courseId: string, userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/courses/${courseId}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  return res.json()
}

export async function cancelSignUp(courseId: string, userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/courses/${courseId}/signup`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  return res.json()
}

export async function fetchFeedbacks(courseId: string): Promise<FeedbackItem[]> {
  const res = await fetch(`${BASE}/courses/${courseId}/feedback`)
  return res.json()
}

export async function submitFeedback(
  courseId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; feedback?: FeedbackItem }> {
  const res = await fetch(`${BASE}/courses/${courseId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rating, comment }),
  })
  return res.json()
}

export async function fetchUserCourses(userId: string): Promise<Course[]> {
  const res = await fetch(`${BASE}/user/${userId}/courses`)
  return res.json()
}

export async function fetchUserAchievements(userId: string): Promise<Achievement[]> {
  const res = await fetch(`${BASE}/user/${userId}/achievements`)
  return res.json()
}
