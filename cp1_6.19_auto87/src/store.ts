import { create } from 'zustand'
import type { Point, PathData, StickyNoteData, ImageData } from './server/server'

export type ToolType = 'pen' | 'note' | 'image'

interface CanvasStore {
  paths: PathData[]
  notes: StickyNoteData[]
  images: ImageData[]
  currentColor: string
  currentLineWidth: number
  currentTool: ToolType
  isDrawing: boolean
  currentPathId: string | null
  currentPathPoints: Point[]
  userId: string | null
  meetingId: string | null
  userName: string
  onlineCount: number
  addPath: (path: PathData) => void
  appendPoint: (pathId: string, point: Point) => void
  addNote: (note: StickyNoteData) => void
  moveNote: (id: string, x: number, y: number) => void
  editNote: (id: string, text: string) => void
  deleteNote: (id: string) => void
  addImage: (image: ImageData) => void
  moveImage: (id: string, x: number, y: number) => void
  deleteImage: (id: string) => void
  clearCanvas: () => void
  setColor: (color: string) => void
  setLineWidth: (width: number) => void
  setTool: (tool: ToolType) => void
  setDrawing: (drawing: boolean) => void
  setCurrentPath: (pathId: string | null) => void
  setUserId: (id: string | null) => void
  setMeetingId: (id: string | null) => void
  setUserName: (name: string) => void
  setOnlineCount: (count: number) => void
  initState: (state: { paths: PathData[]; notes: StickyNoteData[]; images: ImageData[] }) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  paths: [],
  notes: [],
  images: [],
  currentColor: '#FF6B6B',
  currentLineWidth: 5,
  currentTool: 'pen',
  isDrawing: false,
  currentPathId: null,
  currentPathPoints: [],
  userId: null,
  meetingId: null,
  userName: '',
  onlineCount: 0,
  addPath: (path) => set((state) => ({ paths: [...state.paths, path] })),
  appendPoint: (pathId, point) =>
    set((state) => {
      const paths = state.paths.map((p) =>
        p.id === pathId ? { ...p, points: [...p.points, point] } : p,
      )
      return { paths }
    }),
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  moveNote: (id, x, y) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),
  editNote: (id, text) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, text } : n)),
    })),
  deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
  addImage: (image) => set((state) => ({ images: [...state.images, image] })),
  moveImage: (id, x, y) =>
    set((state) => ({
      images: state.images.map((i) => (i.id === id ? { ...i, x, y } : i)),
    })),
  deleteImage: (id) => set((state) => ({ images: state.images.filter((i) => i.id !== id) })),
  clearCanvas: () => set({ paths: [], notes: [], images: [] }),
  setColor: (color) => set({ currentColor: color }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setTool: (tool) => set({ currentTool: tool }),
  setDrawing: (drawing) => set({ isDrawing: drawing }),
  setCurrentPath: (pathId) => set({ currentPathId: pathId }),
  setUserId: (id) => set({ userId: id }),
  setMeetingId: (id) => set({ meetingId: id }),
  setUserName: (name) => set({ userName: name }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  initState: (state) => set({ paths: state.paths, notes: state.notes, images: state.images }),
}))
