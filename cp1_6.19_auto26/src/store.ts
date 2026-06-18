import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'line' | 'path'

export interface Point {
  x: number
  y: number
}

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  cx?: number
  cy?: number
  r?: number
  rx?: number
  ry?: number
  points?: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  d?: string
  fill: string
  stroke: string
  strokeWidth: number
  rotation: number
  opacity: number
}

export interface IconItem {
  id: string
  name: string
  shapes: Shape[]
  createdAt: number
}

interface EditorState {
  shapes: Shape[]
  selectedId: string | null
  currentTool: ShapeType | 'select'
  library: IconItem[]
  undoStack: Shape[][]
  redoStack: Shape[][]
  currentEditingIconId: string | null

  setTool: (tool: ShapeType | 'select') => void
  addShape: (shape: Omit<Shape, 'id'>) => void
  updateShape: (id: string, updates: Partial<Shape>) => void
  deleteShape: (id: string) => void
  selectShape: (id: string | null) => void
  pushUndo: () => void
  undo: () => void
  redo: () => void
  saveToLibrary: (name: string) => string
  loadFromLibrary: (iconId: string) => void
  clearCanvas: () => void
  replaceShapes: (shapes: Shape[]) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: [],
  selectedId: null,
  currentTool: 'select',
  library: [],
  undoStack: [],
  redoStack: [],
  currentEditingIconId: null,

  setTool: (tool) => set({ currentTool: tool }),

  addShape: (shape) => {
    const newShape: Shape = { ...shape, id: uuidv4() }
    const state = get()
    const newUndoStack = [...state.undoStack, state.shapes].slice(-50)
    set({
      shapes: [...state.shapes, newShape],
      selectedId: newShape.id,
      undoStack: newUndoStack,
      redoStack: [],
    })
  },

  updateShape: (id, updates) => {
    const state = get()
    set({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })
  },

  deleteShape: (id) => {
    const state = get()
    const newUndoStack = [...state.undoStack, state.shapes].slice(-50)
    set({
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      undoStack: newUndoStack,
      redoStack: [],
    })
  },

  selectShape: (id) => set({ selectedId: id }),

  pushUndo: () => {
    const state = get()
    const newUndoStack = [...state.undoStack, state.shapes].slice(-50)
    set({ undoStack: newUndoStack, redoStack: [] })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const prevShapes = state.undoStack[state.undoStack.length - 1]
    const newUndoStack = state.undoStack.slice(0, -1)
    set({
      shapes: prevShapes,
      selectedId: null,
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, state.shapes],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const nextShapes = state.redoStack[state.redoStack.length - 1]
    const newRedoStack = state.redoStack.slice(0, -1)
    set({
      shapes: nextShapes,
      selectedId: null,
      undoStack: [...state.undoStack, state.shapes],
      redoStack: newRedoStack,
    })
  },

  saveToLibrary: (name) => {
    const state = get()
    const iconId = uuidv4()
    const icon: IconItem = {
      id: iconId,
      name: name.slice(0, 20),
      shapes: JSON.parse(JSON.stringify(state.shapes)),
      createdAt: Date.now(),
    }
    set({ library: [...state.library, icon], currentEditingIconId: iconId })
    return iconId
  },

  loadFromLibrary: (iconId) => {
    const state = get()
    const icon = state.library.find((i) => i.id === iconId)
    if (icon) {
      set({
        shapes: JSON.parse(JSON.stringify(icon.shapes)),
        selectedId: null,
        currentEditingIconId: iconId,
      })
    }
  },

  clearCanvas: () => {
    const state = get()
    const newUndoStack = [...state.undoStack, state.shapes].slice(-50)
    set({
      shapes: [],
      selectedId: null,
      undoStack: newUndoStack,
      redoStack: [],
    })
  },

  replaceShapes: (shapes) => {
    const state = get()
    const newUndoStack = [...state.undoStack, state.shapes].slice(-50)
    set({
      shapes,
      selectedId: null,
      undoStack: newUndoStack,
      redoStack: [],
    })
  },
}))

export function renderShapesToSvg(shapes: Shape[], width = 400, height = 400): string {
  const shapesSvg = shapes
    .map((s) => {
      const transform = s.rotation ? ` transform="rotate(${s.rotation} ${s.x + s.width / 2} ${s.y + s.height / 2})"` : ''
      const style = ` opacity="${s.opacity / 100}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}"`
      switch (s.type) {
        case 'rect':
          return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}"${style}${transform}/>`
        case 'circle':
          return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"${style}${transform}/>`
        case 'ellipse':
          return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"${style}${transform}/>`
        case 'polygon':
          return `<polygon points="${s.points}"${style}${transform}/>`
        case 'line':
          return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"${style}${transform}/>`
        case 'path':
          return `<path d="${s.d}"${style}${transform}/>`
        default:
          return ''
      }
    })
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${shapesSvg}
</svg>`
}
