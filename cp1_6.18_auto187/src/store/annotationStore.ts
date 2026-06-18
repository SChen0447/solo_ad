import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Annotation, HistorySnapshot, ToolType } from '../types'

interface AnnotationState {
  annotations: Annotation[]
  history: HistorySnapshot[]
  currentHistoryIndex: number
  selectedAnnotationId: string | null
  currentTool: ToolType
  isDraggingSlider: boolean
  backgroundImage: string | null
}

interface AnnotationActions {
  setCurrentTool: (tool: ToolType) => void
  setSelectedAnnotationId: (id: string | null) => void
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  deleteSelectedAnnotation: () => void
  createSnapshot: () => void
  restoreSnapshot: (index: number) => void
  setIsDraggingSlider: (dragging: boolean) => void
  setBackgroundImage: (image: string | null) => void
  clearAll: () => void
}

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

const initialState: AnnotationState = {
  annotations: [],
  history: [],
  currentHistoryIndex: -1,
  selectedAnnotationId: null,
  currentTool: 'select',
  isDraggingSlider: false,
  backgroundImage: null,
}

export const useAnnotationStore = create<AnnotationState & AnnotationActions>((set, get) => ({
  ...initialState,

  setCurrentTool: (tool) => {
    set({ currentTool: tool })
    if (tool !== 'select') {
      set({ selectedAnnotationId: null })
    }
  },

  setSelectedAnnotationId: (id) => {
    set({ selectedAnnotationId: id })
  },

  addAnnotation: (annotation) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: uuidv4(),
      createdAt: Date.now(),
    } as Annotation

    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
    }))

    get().createSnapshot()
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      ),
    }))

    get().createSnapshot()
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((ann) => ann.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }))

    get().createSnapshot()
  },

  deleteSelectedAnnotation: () => {
    const { selectedAnnotationId, deleteAnnotation } = get()
    if (selectedAnnotationId) {
      deleteAnnotation(selectedAnnotationId)
    }
  },

  createSnapshot: () => {
    const { annotations, history, currentHistoryIndex, isDraggingSlider } = get()
    
    if (isDraggingSlider) return

    const startTime = performance.now()
    
    const snapshot: HistorySnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      annotations: deepClone(annotations),
    }

    const newHistory = history.slice(0, currentHistoryIndex + 1)
    newHistory.push(snapshot)

    set({
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1,
    })

    const duration = performance.now() - startTime
    if (duration > 50) {
      console.warn(`Snapshot creation took ${duration.toFixed(2)}ms, which exceeds 50ms limit`)
    }
  },

  restoreSnapshot: (index) => {
    const { history } = get()
    if (index < 0 || index >= history.length) return

    const snapshot = history[index]
    set({
      annotations: deepClone(snapshot.annotations),
      currentHistoryIndex: index,
      selectedAnnotationId: null,
    })
  },

  setIsDraggingSlider: (dragging) => {
    set({ isDraggingSlider: dragging })
    
    if (!dragging) {
      const { annotations, history, currentHistoryIndex } = get()
      
      if (currentHistoryIndex < history.length - 1) {
        const newHistory = history.slice(0, currentHistoryIndex + 1)
        const newSnapshot: HistorySnapshot = {
          id: uuidv4(),
          timestamp: Date.now(),
          annotations: deepClone(annotations),
        }
        newHistory.push(newSnapshot)
        
        set({
          history: newHistory,
          currentHistoryIndex: newHistory.length - 1,
        })
      }
    }
  },

  setBackgroundImage: (image) => {
    set({ backgroundImage: image })
  },

  clearAll: () => {
    set({
      annotations: [],
      history: [],
      currentHistoryIndex: -1,
      selectedAnnotationId: null,
    })
    get().createSnapshot()
  },
}))
