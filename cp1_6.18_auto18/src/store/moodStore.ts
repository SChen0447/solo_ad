import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { MoodType, MoodEntry } from '../types'

interface MoodStore {
  moods: MoodEntry[]
  currentMood: MoodType | null
  timeFilter: 'today' | 'week' | 'month'
  notification: { distance: number; mood: MoodType } | null
  addMood: (mood: Omit<MoodEntry, 'id' | 'timestamp'>) => void
  getFilteredMoods: () => MoodEntry[]
  setCurrentMood: (mood: MoodType | null) => void
  setTimeFilter: (filter: 'today' | 'week' | 'month') => void
  setNotification: (notification: { distance: number; mood: MoodType } | null) => void
}

export const useMoodStore = create<MoodStore>((set, get) => ({
  moods: [],
  currentMood: null,
  timeFilter: 'week',
  notification: null,

  addMood: (moodData) => {
    const newMood: MoodEntry = {
      ...moodData,
      id: uuidv4(),
      timestamp: Date.now()
    }
    set((state) => ({
      moods: [newMood, ...state.moods].slice(0, 500),
      currentMood: moodData.mood
    }))
  },

  getFilteredMoods: () => {
    const { moods, timeFilter } = get()
    const now = Date.now()
    let cutoff: number

    switch (timeFilter) {
      case 'today':
        cutoff = now - 24 * 60 * 60 * 1000
        break
      case 'week':
        cutoff = now - 7 * 24 * 60 * 60 * 1000
        break
      case 'month':
        cutoff = now - 30 * 24 * 60 * 60 * 1000
        break
    }

    return moods.filter((mood) => mood.timestamp >= cutoff)
  },

  setCurrentMood: (mood) => set({ currentMood: mood }),

  setTimeFilter: (filter) => set({ timeFilter: filter }),

  setNotification: (notification) => set({ notification })
}))

export const MOOD_CONFIG: Record<MoodType, { emoji: string; color: string; gradient: string; name: string }> = {
  happy: { emoji: '😊', color: '#FFB347', gradient: '#FF8C00', name: '快乐' },
  calm: { emoji: '😌', color: '#98FB98', gradient: '#3CB371', name: '平静' },
  sad: { emoji: '😢', color: '#87CEEB', gradient: '#4682B4', name: '忧郁' },
  angry: { emoji: '😠', color: '#FF6B6B', gradient: '#DC143C', name: '愤怒' },
  surprised: { emoji: '😮', color: '#FFD700', gradient: '#FFA500', name: '惊喜' },
  loved: { emoji: '❤️', color: '#FFB6C1', gradient: '#FF69B4', name: '喜爱' }
}
