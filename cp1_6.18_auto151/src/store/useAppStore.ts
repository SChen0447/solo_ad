import { create } from 'zustand'

export type OrnamentType = 'ball' | 'star' | 'gift'
export type BallColor = 'red' | 'gold' | 'blue' | 'silver'

export interface Ornament {
  id: string
  type: OrnamentType
  position: [number, number, number]
  size: number
  color?: BallColor
  isNew?: boolean
}

interface AppState {
  ornaments: Ornament[]
  selectedOrnamentType: OrnamentType | null
  selectedBallColor: BallColor
  ornamentSize: number
  blessingText: string
  isDragging: boolean
  draggingOrnamentId: string | null
  showDeleteConfirm: boolean
  showToast: boolean
  toastMessage: string
  isMobilePanelOpen: boolean
  resetCameraTrigger: number

  setSelectedOrnamentType: (type: OrnamentType | null) => void
  setSelectedBallColor: (color: BallColor) => void
  setOrnamentSize: (size: number) => void
  setBlessingText: (text: string) => void
  addOrnament: (ornament: Omit<Ornament, 'id' | 'isNew'>) => void
  removeOrnament: (id: string) => void
  updateOrnamentPosition: (id: string, position: [number, number, number]) => void
  clearAllOrnaments: () => void
  setIsDragging: (dragging: boolean) => void
  setDraggingOrnamentId: (id: string | null) => void
  setShowDeleteConfirm: (show: boolean) => void
  showToastMessage: (message: string) => void
  hideToast: () => void
  setIsMobilePanelOpen: (open: boolean) => void
  triggerResetCamera: () => void

  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  generateShareLink: () => string
  loadFromShareLink: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 11)

const BALL_COLORS: Record<BallColor, string> = {
  red: '#ff3b3b',
  gold: '#ffd700',
  blue: '#4a9eff',
  silver: '#c0c0c0'
}

export { BALL_COLORS }

export const useAppStore = create<AppState>((set, get) => ({
  ornaments: [],
  selectedOrnamentType: null,
  selectedBallColor: 'red',
  ornamentSize: 0.2,
  blessingText: '',
  isDragging: false,
  draggingOrnamentId: null,
  showDeleteConfirm: false,
  showToast: false,
  toastMessage: '',
  isMobilePanelOpen: false,
  resetCameraTrigger: 0,

  setSelectedOrnamentType: (type) => set({ selectedOrnamentType: type }),
  setSelectedBallColor: (color) => set({ selectedBallColor: color }),
  setOrnamentSize: (size) => set({ ornamentSize: size }),
  setBlessingText: (text) => set({ blessingText: text.slice(0, 30) }),

  addOrnament: (ornament) =>
    set((state) => ({
      ornaments: [
        ...state.ornaments,
        { ...ornament, id: generateId(), isNew: true }
      ]
    })),

  removeOrnament: (id) =>
    set((state) => ({
      ornaments: state.ornaments.filter((o) => o.id !== id)
    })),

  updateOrnamentPosition: (id, position) =>
    set((state) => ({
      ornaments: state.ornaments.map((o) =>
        o.id === id ? { ...o, position } : o
      )
    })),

  clearAllOrnaments: () => set({ ornaments: [] }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDraggingOrnamentId: (id) => set({ draggingOrnamentId: id }),
  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show }),

  showToastMessage: (message) => {
    set({ showToast: true, toastMessage: message })
    setTimeout(() => set({ showToast: false }), 2000)
  },

  hideToast: () => set({ showToast: false }),
  setIsMobilePanelOpen: (open) => set({ isMobilePanelOpen: open }),
  triggerResetCamera: () =>
    set((state) => ({ resetCameraTrigger: state.resetCameraTrigger + 1 })),

  saveToLocalStorage: () => {
    const { ornaments, blessingText } = get()
    const data = { ornaments, blessingText }
    localStorage.setItem('christmas-tree-decorator', JSON.stringify(data))
    get().showToastMessage('保存成功！')
  },

  loadFromLocalStorage: () => {
    const saved = localStorage.getItem('christmas-tree-decorator')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        set({
          ornaments: data.ornaments || [],
          blessingText: data.blessingText || ''
        })
      } catch (e) {
        console.error('Failed to load from localStorage', e)
      }
    }
  },

  generateShareLink: () => {
    const { ornaments, blessingText } = get()
    const data = { ornaments, blessingText }
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)))
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`
    return url
  },

  loadFromShareLink: () => {
    const params = new URLSearchParams(window.location.search)
    const shareData = params.get('share')
    if (shareData) {
      try {
        const decoded = decodeURIComponent(atob(shareData))
        const data = JSON.parse(decoded)
        set({
          ornaments: data.ornaments || [],
          blessingText: data.blessingText || ''
        })
      } catch (e) {
        console.error('Failed to load share data', e)
      }
    }
  }
}))
