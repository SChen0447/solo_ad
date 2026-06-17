import { create } from 'zustand'
import type { Stage, Comment, StageRatings } from '../../shared/types'

interface AppState {
  stages: Stage[]
  comments: Comment[]
  ratings: StageRatings[]
  setStages: (stages: Stage[]) => void
  setComments: (comments: Comment[]) => void
  setRatings: (ratings: StageRatings[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  stages: [],
  comments: [],
  ratings: [],
  setStages: (stages) => set({ stages }),
  setComments: (comments) => set({ comments }),
  setRatings: (ratings) => set({ ratings }),
}))
