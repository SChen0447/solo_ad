import axios from 'axios'
import { io, Socket } from 'socket.io-client'

export interface Prize {
  id: string
  name: string
  count: number
  color: string
  probability: number
}

export interface Activity {
  id: string
  name: string
  code: string
  prizes: Prize[]
  maxDraws: number
  duration: number
  isActive: boolean
  createdAt: string
  shareUrl: string
}

export interface WinRecord {
  id: string
  participantId: string
  participantName: string
  prizeId: string
  prizeName: string
  prizeColor: string
  timestamp: string
}

export interface Participant {
  id: string
  name: string
  drawCount: number
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
})

let socket: Socket | null = null

export const getSocket = (): Socket | null => socket

export const initSocket = (activityId: string, participantId?: string): Socket => {
  if (socket) {
    socket.disconnect()
  }
  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    query: {
      activityId,
      participantId: participantId || ''
    }
  })
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const activityApi = {
  create: (data: {
    name: string
    prizes: Omit<Prize, 'id'>[]
    maxDraws: number
    duration: number
  }) => api.post<Activity>('/activities', data),

  get: (code: string) => api.get<Activity>(`/activities/${code}`),

  getByAdmin: (id: string) => api.get<Activity>(`/admin/activities/${id}`),

  toggleStatus: (id: string, isActive: boolean) =>
    api.patch<Activity>(`/admin/activities/${id}/status`, { isActive })
}

export const drawApi = {
  spin: (activityId: string, participantId: string, sessionId: string) =>
    api.post<WinRecord>(`/draw/${activityId}`, { participantId, sessionId }),

  getMyRecords: (activityId: string, participantId: string) =>
    api.get<WinRecord[]>(`/draw/${activityId}/records?participantId=${participantId}`)
}

export const adminApi = {
  getRecords: (activityId: string, prizeFilter?: string, search?: string) => {
    const params = new URLSearchParams()
    if (prizeFilter) params.set('prize', prizeFilter)
    if (search) params.set('search', search)
    return api.get<WinRecord[]>(`/admin/activities/${activityId}/records?${params.toString()}`)
  },

  getParticipants: (activityId: string) =>
    api.get<Participant[]>(`/admin/activities/${activityId}/participants`)
}

export const participantApi = {
  join: (activityId: string, name: string) =>
    api.post<{ participantId: string; name: string }>(`/participants/${activityId}`, { name })
}
