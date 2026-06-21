import axios from 'axios'
import type { Course, CourseDetail, Quiz, QuizResult } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const courseApi = {
  getAll: (): Promise<Course[]> =>
    api.get('/courses').then(res => res.data),

  getById: (id: number): Promise<CourseDetail> =>
    api.get(`/courses/${id}`).then(res => res.data),

  create: (data: Partial<Course>): Promise<Course> =>
    api.post('/courses', data).then(res => res.data),

  update: (id: number, data: Partial<Course>): Promise<Course> =>
    api.put(`/courses/${id}`, data).then(res => res.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/courses/${id}`).then(res => res.data),

  addChapter: (courseId: number, data: any): Promise<any> =>
    api.post(`/courses/${courseId}/chapters`, data).then(res => res.data),

  updateChapter: (chapterId: number, data: any): Promise<any> =>
    api.put(`/courses/chapters/${chapterId}`, data).then(res => res.data),

  deleteChapter: (chapterId: number): Promise<void> =>
    api.delete(`/courses/chapters/${chapterId}`).then(res => res.data),
}

export const quizApi = {
  getByCourse: (courseId: number, chapterId?: number): Promise<Quiz> =>
    api.get(`/quizzes/${courseId}`, { params: { chapterId } }).then(res => res.data),

  submit: (courseId: number, chapterId: number, answers: Record<number, number[] | number>): Promise<QuizResult> =>
    api.post(`/quizzes/${courseId}`, { chapterId, answers }).then(res => res.data),

  create: (data: any): Promise<any> =>
    api.post('/quizzes', data).then(res => res.data),

  update: (quizId: number, data: any): Promise<any> =>
    api.put(`/quizzes/${quizId}`, data).then(res => res.data),

  delete: (quizId: number): Promise<void> =>
    api.delete(`/quizzes/${quizId}`).then(res => res.data),

  addQuestion: (quizId: number, data: any): Promise<any> =>
    api.post(`/quizzes/${quizId}/questions`, data).then(res => res.data),

  updateQuestion: (questionId: number, data: any): Promise<any> =>
    api.put(`/quizzes/questions/${questionId}`, data).then(res => res.data),

  deleteQuestion: (questionId: number): Promise<void> =>
    api.delete(`/quizzes/questions/${questionId}`).then(res => res.data),
}

export const progressApi = {
  getCourses: (): Promise<any[]> =>
    api.get('/progress/courses').then(res => res.data),

  getByCourse: (courseId: number): Promise<any[]> =>
    api.get(`/progress/courses/${courseId}`).then(res => res.data),

  getStats: (): Promise<any> =>
    api.get('/progress/stats').then(res => res.data),

  resetCourse: (courseId: number): Promise<void> =>
    api.post(`/progress/reset/${courseId}`).then(res => res.data),

  getAdminStats: (): Promise<any> =>
    api.get('/progress/admin/stats').then(res => res.data),
}

export default api
