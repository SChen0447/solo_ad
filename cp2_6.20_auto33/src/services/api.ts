import { useState, useCallback } from 'react'

export interface User {
  id: string
  username: string
  role: 'member' | 'coach' | 'admin'
  name: string
  avatar: string
}

export interface Course {
  id: string
  name: string
  startTime: string
  endTime: string
  coachId: string
  coachName: string
  coachAvatar: string
  maxCapacity: number
  currentCapacity: number
  status: 'normal' | 'cancelled'
  cancelReason?: string
  isBooked?: boolean
  members?: { id: string; name: string; avatar: string }[]
}

export interface AdminUser {
  id: string
  username: string
  name: string
  role: 'member' | 'coach' | 'admin'
  avatar: string
  disabled: boolean
}

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function setToken(token: string): void {
  localStorage.setItem('token', token)
}

function removeToken(): void {
  localStorage.removeItem('token')
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }

  return data as T
}

export function useApi<T>(
  apiFn: () => Promise<T>
): { data: T | null; loading: boolean; error: string | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }, [apiFn])

  return { data, loading, error, refetch }
}

export const api = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    return request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  },

  logout: async (): Promise<{ message: string }> => {
    return request('/logout', {
      method: 'POST'
    })
  },

  getCourses: async (date?: string): Promise<Course[]> => {
    const url = date ? `/courses?date=${date}` : '/courses'
    return request(url)
  },

  getUpcomingCourses: async (): Promise<Course[]> => {
    return request('/courses/upcoming')
  },

  getMyBookings: async (): Promise<Course[]> => {
    return request('/my-bookings')
  },

  bookCourse: async (courseId: string): Promise<Course> => {
    return request('/book', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    })
  },

  cancelBooking: async (courseId: string): Promise<Course> => {
    return request('/cancel-booking', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    })
  },

  getCoachSchedule: async (date?: string): Promise<Course[]> => {
    const url = date ? `/coach/schedule?date=${date}` : '/coach/schedule'
    return request(url)
  },

  updateCourseStatus: async (id: string, status: string, cancelReason?: string): Promise<Course> => {
    return request(`/coach/schedule/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancelReason })
    })
  },

  getAdminCourses: async (): Promise<Course[]> => {
    return request('/admin/courses')
  },

  createCourse: async (data: {
    name: string
    startTime: string
    endTime: string
    coachId: string
    maxCapacity: number
  }): Promise<Course> => {
    return request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  updateCourse: async (
    id: string,
    data: {
      name?: string
      startTime?: string
      endTime?: string
      coachId?: string
      maxCapacity?: number
    }
  ): Promise<Course> => {
    return request(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  deleteCourse: async (id: string): Promise<{ message: string }> => {
    return request(`/admin/courses/${id}`, {
      method: 'DELETE'
    })
  },

  getUsers: async (): Promise<AdminUser[]> => {
    return request('/admin/users')
  },

  toggleUserStatus: async (id: string): Promise<AdminUser> => {
    return request(`/admin/users/${id}/toggle`, {
      method: 'PATCH'
    })
  },

  getCoaches: async (): Promise<{ id: string; name: string; avatar: string }[]> => {
    return request('/admin/coaches')
  }
}

export { getToken, setToken, removeToken }
