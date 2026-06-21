import { create } from 'zustand'

interface CurrentUser {
  id: string
  name: string
  role: 'owner' | 'caregiver'
}

interface AppStore {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  loginModalOpen: boolean
  setLoginModalOpen: (open: boolean) => void
  evaluateModalTask: any | null
  setEvaluateModalTask: (task: any | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  loginModalOpen: false,
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  evaluateModalTask: null,
  setEvaluateModalTask: (task) => set({ evaluateModalTask: task }),
}))

export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || '请求失败')
  }
  return data.data as T
}
