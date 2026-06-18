import { create } from 'zustand'

export interface User {
  id: string
  name: string
  avatar: string
  creditScore: number
  successfulExchanges: number
  badges: string[]
  consecutiveSuccess: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateCreditScore: (score: number) => void
  addBadge: (badge: string) => void
  incrementSuccessfulExchanges: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: {
    id: 'user-001',
    name: '小明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    creditScore: 100,
    successfulExchanges: 0,
    badges: [],
    consecutiveSuccess: 0,
  },
  token: 'mock-token-001',
  isAuthenticated: true,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
  updateCreditScore: (score) =>
    set((state) => ({
      user: state.user ? { ...state.user, creditScore: score } : null,
    })),
  addBadge: (badge) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            badges: [...state.user.badges, badge],
          }
        : null,
    })),
  incrementSuccessfulExchanges: () =>
    set((state) => {
      if (!state.user) return {}
      const newConsecutive = state.user.consecutiveSuccess + 1
      let newScore = state.user.creditScore + 5
      const newBadges = [...state.user.badges]

      if (newConsecutive === 3) {
        newScore += 20
        if (!newBadges.includes('交换达人')) {
          newBadges.push('交换达人')
        }
      }

      return {
        user: {
          ...state.user,
          successfulExchanges: state.user.successfulExchanges + 1,
          creditScore: newScore,
          consecutiveSuccess: newConsecutive,
          badges: newBadges,
        },
      }
    }),
}))
