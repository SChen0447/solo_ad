import { create } from 'zustand'
import type { Animal, Announcement, AdoptionApplication } from '@/types'

interface AppState {
  animals: Animal[]
  announcements: Announcement[]
  adoptions: AdoptionApplication[]
  selectedAnimal: Animal | null
  showAdoptForm: boolean
  loading: boolean
  setAnimals: (animals: Animal[]) => void
  setAnnouncements: (announcements: Announcement[]) => void
  setAdoptions: (adoptions: AdoptionApplication[]) => void
  setSelectedAnimal: (animal: Animal | null) => void
  setShowAdoptForm: (show: boolean) => void
  setLoading: (loading: boolean) => void
  fetchAnimals: () => Promise<void>
  fetchAnnouncements: () => Promise<void>
  fetchAdoptions: () => Promise<void>
  submitAdoption: (data: { applicantName: string; phone: string; address: string; reason: string; animalId: string }) => Promise<{ success: boolean; error?: string }>
  reviewAdoption: (id: string, status: 'approved' | 'rejected') => Promise<boolean>
}

export const useAppStore = create<AppState>((set, get) => ({
  animals: [],
  announcements: [],
  adoptions: [],
  selectedAnimal: null,
  showAdoptForm: false,
  loading: false,

  setAnimals: (animals) => set({ animals }),
  setAnnouncements: (announcements) => set({ announcements }),
  setAdoptions: (adoptions) => set({ adoptions }),
  setSelectedAnimal: (animal) => set({ selectedAnimal: animal }),
  setShowAdoptForm: (show) => set({ showAdoptForm: show }),
  setLoading: (loading) => set({ loading }),

  fetchAnimals: async () => {
    try {
      const res = await fetch('/api/animals')
      const data = await res.json()
      set({ animals: data })
    } catch {
      console.error('获取动物列表失败')
    }
  },

  fetchAnnouncements: async () => {
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      set({ announcements: data })
    } catch {
      console.error('获取公告失败')
    }
  },

  fetchAdoptions: async () => {
    try {
      const res = await fetch('/api/adoptions')
      const data = await res.json()
      set({ adoptions: data })
    } catch {
      console.error('获取领养申请失败')
    }
  },

  submitAdoption: async (data) => {
    try {
      const res = await fetch('/api/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        return { success: false, error: err.error || '提交失败' }
      }
      const application = await res.json()
      set((state) => ({
        adoptions: [...state.adoptions, application],
        animals: state.animals.map((a) =>
          a.id === data.animalId ? { ...a, status: 'pending' } : a
        ),
      }))
      return { success: true }
    } catch {
      return { success: false, error: '网络错误' }
    }
  },

  reviewAdoption: async (id, status) => {
    try {
      const res = await fetch(`/api/adopt/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return false
      const updated = await res.json()
      set((state) => ({
        adoptions: state.adoptions.map((a) =>
          a.id === id ? updated : a
        ),
      }))
      return true
    } catch {
      return false
    }
  },
}))
