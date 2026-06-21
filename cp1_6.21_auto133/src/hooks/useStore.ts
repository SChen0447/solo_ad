import { create } from 'zustand'
import type { User, Song } from '@/shared/types'

interface AppState {
  user: User | null
  isAuthenticated: boolean
  currentSong: Song | null
  isPlaying: boolean
  volume: number
  progress: number
  sessionId: string
  login: (user: User) => void
  logout: () => void
  setCurrentSong: (song: Song | null) => void
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
}

const getSessionId = (): string => {
  let id = localStorage.getItem('music_session_id')
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    localStorage.setItem('music_session_id', id)
  }
  return id
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('music_user'),
  currentSong: null,
  isPlaying: false,
  volume: 70,
  progress: 0,
  sessionId: getSessionId(),
  login: (user) => {
    localStorage.setItem('music_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('music_user')
    set({ user: null, isAuthenticated: false })
  },
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: !!song, progress: 0 }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
}))
