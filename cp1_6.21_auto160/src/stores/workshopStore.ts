import { create } from 'zustand'
import type { Course, CourseDetail, Enrollment, Stats } from '@/types'
import {
  fetchCourses,
  fetchCourseById,
  createEnrollment,
  deleteEnrollment,
  fetchStats,
  createCourse,
} from '@/services/courseService'

interface WorkshopStore {
  courses: Course[]
  currentCourse: CourseDetail | null
  stats: Stats | null
  loading: boolean
  error: string | null

  loadCourses: () => Promise<void>
  loadCourseById: (id: number) => Promise<void>
  loadStats: () => Promise<void>
  enroll: (data: {
    courseId: number
    name: string
    phone: string
    email: string
    skillLevel: string
  }) => Promise<void>
  cancelEnrollment: (id: number) => Promise<void>
  addCourse: (data: {
    name: string
    date: string
    duration: number
    maxSlots: number
    fee: number
    description: string
    coverImage: string
    materials?: { name: string; estimatedUsage: number; unit: string }[]
  }) => Promise<void>
}

export const useWorkshopStore = create<WorkshopStore>((set, get) => ({
  courses: [],
  currentCourse: null,
  stats: null,
  loading: false,
  error: null,

  loadCourses: async () => {
    set({ loading: true, error: null })
    try {
      const courses = await fetchCourses()
      set({ courses, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  loadCourseById: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const course = await fetchCourseById(id)
      set({ currentCourse: course, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  loadStats: async () => {
    try {
      const stats = await fetchStats()
      set({ stats })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  enroll: async (data) => {
    set({ loading: true, error: null })
    try {
      await createEnrollment(data)
      const course = await fetchCourseById(data.courseId)
      set({ currentCourse: course, loading: false })
      const { courses } = get()
      const updatedCourses = courses.map((c) =>
        c.id === data.courseId ? { ...c, enrolledCount: (c.enrolledCount || 0) + 1 } : c
      )
      set({ courses: updatedCourses })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  cancelEnrollment: async (id: number) => {
    try {
      const { currentCourse } = get()
      await deleteEnrollment(id)
      if (currentCourse) {
        const updated = await fetchCourseById(currentCourse.id)
        set({ currentCourse: updated })
      }
      const { courses } = get()
      const updatedCourses = courses.map((c) =>
        c.id === currentCourse?.id ? { ...c, enrolledCount: Math.max(0, (c.enrolledCount || 1) - 1) } : c
      )
      set({ courses: updatedCourses })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  addCourse: async (data) => {
    set({ loading: true, error: null })
    try {
      await createCourse(data)
      await get().loadCourses()
      await get().loadStats()
      set({ loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
}))
