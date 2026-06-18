import { create } from 'zustand'
import { ColorScheme, generateHarmoniousSchemes } from '../utils/colorUtils'

export interface Snapshot {
  id: string
  colors: ColorScheme
  thumbnail: string
  timestamp: number
}

interface StoreState {
  shadeColor: string
  poleColor: string
  baseColor: string
  snapshots: Snapshot[]
  selectedSnapshotId: string | null
  showToast: boolean
  toastMessage: string

  setShadeColor: (color: string) => void
  setPoleColor: (color: string) => void
  setBaseColor: (color: string) => void
  addSnapshot: (thumbnail: string) => boolean
  removeSnapshot: (id: string) => void
  restoreSnapshot: (id: string) => void
  generateAutoSchemes: (createThumbnail: (colors: ColorScheme) => string) => void
  setShowToast: (show: boolean, message?: string) => void
}

const DEFAULT_COLORS: ColorScheme = {
  shade: '#4A90D9',
  pole: '#E0C9A6',
  base: '#333333'
}

const MAX_SNAPSHOTS = 6

export const useStore = create<StoreState>((set, get) => ({
  shadeColor: DEFAULT_COLORS.shade,
  poleColor: DEFAULT_COLORS.pole,
  baseColor: DEFAULT_COLORS.base,
  snapshots: [],
  selectedSnapshotId: null,
  showToast: false,
  toastMessage: '',

  setShadeColor: (color: string) => set({ shadeColor: color }),
  setPoleColor: (color: string) => set({ poleColor: color }),
  setBaseColor: (color: string) => set({ baseColor: color }),

  addSnapshot: (thumbnail: string) => {
    const { snapshots, shadeColor, poleColor, baseColor } = get()
    if (snapshots.length >= MAX_SNAPSHOTS) {
      return false
    }
    const newSnapshot: Snapshot = {
      id: Date.now().toString(),
      colors: { shade: shadeColor, pole: poleColor, base: baseColor },
      thumbnail,
      timestamp: Date.now()
    }
    set({ snapshots: [...snapshots, newSnapshot] })
    return true
  },

  removeSnapshot: (id: string) => {
    const { snapshots, selectedSnapshotId } = get()
    set({
      snapshots: snapshots.filter(s => s.id !== id),
      selectedSnapshotId: selectedSnapshotId === id ? null : selectedSnapshotId
    })
  },

  restoreSnapshot: (id: string) => {
    const { snapshots } = get()
    const snapshot = snapshots.find(s => s.id === id)
    if (snapshot) {
      set({
        shadeColor: snapshot.colors.shade,
        poleColor: snapshot.colors.pole,
        baseColor: snapshot.colors.base,
        selectedSnapshotId: id
      })
    }
  },

  generateAutoSchemes: (createThumbnail: (colors: ColorScheme) => string) => {
    const schemes = generateHarmoniousSchemes(5)
    const { snapshots } = get()
    let newSnapshots = [...snapshots]

    for (const scheme of schemes) {
      const thumbnail = createThumbnail(scheme)
      const newSnapshot: Snapshot = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        colors: scheme,
        thumbnail,
        timestamp: Date.now()
      }

      if (newSnapshots.length >= MAX_SNAPSHOTS) {
        newSnapshots = [...newSnapshots.slice(1), newSnapshot]
      } else {
        newSnapshots.push(newSnapshot)
      }
    }

    set({ snapshots: newSnapshots })
  },

  setShowToast: (show: boolean, message?: string) => {
    set({ showToast: show, toastMessage: message || '' })
  }
}))
