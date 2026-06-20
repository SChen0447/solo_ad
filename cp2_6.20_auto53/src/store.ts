import { create } from 'zustand'
import type { Course, FeedbackItem, Achievement } from './api'
import {
  fetchCourses,
  fetchCourse,
  fetchFeedbacks,
  signUp as apiSignUp,
  cancelSignUp as apiCancelSignUp,
  submitFeedback as apiSubmitFeedback,
  fetchUserCourses,
  fetchUserAchievements,
} from './api'

interface AppState {
  courses: Course[]
  currentCourse: Course | null
  feedbacks: FeedbackItem[]
  userCourses: Course[]
  achievements: Achievement[]
  loading: boolean
  userId: string
  loadCourses: () => Promise<void>
  loadCourse: (id: string) => Promise<void>
  loadFeedbacks: (courseId: string) => Promise<void>
  signUp: (courseId: string) => Promise<boolean>
  cancelSignUp: (courseId: string) => Promise<boolean>
  submitFeedback: (courseId: string, rating: number, comment: string) => Promise<boolean>
  loadUserCourses: () => Promise<void>
  loadAchievements: () => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  courses: [],
  currentCourse: null,
  feedbacks: [],
  userCourses: [],
  achievements: [],
  loading: false,
  userId: 'user-1',

  loadCourses: async () => {
    set({ loading: true })
    const courses = await fetchCourses()
    set({ courses, loading: false })
  },

  loadCourse: async (id: string) => {
    set({ loading: true })
    const course = await fetchCourse(id)
    set({ currentCourse: course, loading: false })
  },

  loadFeedbacks: async (courseId: string) => {
    const feedbacks = await fetchFeedbacks(courseId)
    set({ feedbacks })
  },

  signUp: async (courseId: string) => {
    const { userId } = get()
    const result = await apiSignUp(courseId, userId)
    if (result.success) {
      const course = await fetchCourse(courseId)
      set((state) => ({
        currentCourse: course,
        courses: state.courses.map((c) => (c.id === courseId ? course : c)),
      }))
    }
    return result.success
  },

  cancelSignUp: async (courseId: string) => {
    const { userId } = get()
    const result = await apiCancelSignUp(courseId, userId)
    if (result.success) {
      const course = await fetchCourse(courseId)
      set((state) => ({
        currentCourse: course,
        courses: state.courses.map((c) => (c.id === courseId ? course : c)),
      }))
    }
    return result.success
  },

  submitFeedback: async (courseId: string, rating: number, comment: string) => {
    const { userId } = get()
    const result = await apiSubmitFeedback(courseId, userId, rating, comment)
    if (result.success && result.feedback) {
      set((state) => ({
        feedbacks: [result.feedback!, ...state.feedbacks],
      }))
    }
    return result.success
  },

  loadUserCourses: async () => {
    const { userId } = get()
    const userCourses = await fetchUserCourses(userId)
    set({ userCourses })
  },

  loadAchievements: async () => {
    const { userId } = get()
    const achievements = await fetchUserAchievements(userId)
    set({ achievements })
  },
}))
