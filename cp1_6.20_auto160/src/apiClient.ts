import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface Course {
  id: string
  title: string
  description: string
  cover: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  rating: number
}

export interface Step {
  order: number
  title: string
  description: string
}

export interface Submission {
  id: string
  username: string
  image: string
  score: number
  createdAt: string
}

export interface CourseDetail extends Course {
  steps: Step[]
  submissions: Submission[]
}

export interface FlavorScores {
  sweet: number
  salty: number
  sour: number
  bitter: number
  umami: number
  appearance: number
}

export interface ScoreResult {
  submissionId: string
  scores: FlavorScores
  suggestions: string[]
  overallScore: number
}

export async function fetchCourses(search?: string, difficulty?: string): Promise<Course[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (difficulty) params.difficulty = difficulty
  const res = await api.get<Course[]>('/courses', { params })
  return res.data
}

export async function fetchCourseDetail(courseId: string): Promise<CourseDetail> {
  const res = await api.get<CourseDetail>(`/courses/${courseId}`)
  return res.data
}

export async function submitWork(
  courseId: string,
  image: File | null,
  description: string
): Promise<ScoreResult> {
  const formData = new FormData()
  if (image) formData.append('image', image)
  formData.append('description', description)
  const res = await api.post<ScoreResult>(`/courses/${courseId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function fetchSubmissions(courseId: string): Promise<Submission[]> {
  const res = await api.get<Submission[]>(`/courses/${courseId}/submissions`)
  return res.data
}
