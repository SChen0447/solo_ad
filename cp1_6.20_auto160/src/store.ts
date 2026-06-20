import { create } from 'zustand'
import { fetchCourses, type Course } from './apiClient'

interface AppState {
  courses: Course[]
  loading: boolean
  loadCourses: (search?: string, difficulty?: string) => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  courses: [],
  loading: false,
  loadCourses: async (search?: string, difficulty?: string) => {
    set({ loading: true })
    try {
      const courses = await fetchCourses(search, difficulty)
      set({ courses, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
