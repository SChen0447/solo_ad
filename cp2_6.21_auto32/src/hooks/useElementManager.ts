import { create } from 'zustand'
import {
  CanvasElement,
  ElementType,
  GuideLine,
  PaperSize,
  Template,
} from '../types'

const ELEMENT_DEFAULTS: Record<ElementType, Partial<CanvasElement>> = {
  rect: {
    width: 120,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
  },
  text: {
    width: 160,
    height: 40,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderWidth: 0,
    borderColor: '#000000',
    borderRadius: 0,
    text: '文本',
    fontSize: 14,
    fontColor: '#374151',
    letterSpacing: 0,
  },
  line: {
    width: 200,
    height: 2,
    backgroundColor: '#9CA3AF',
    borderStyle: 'solid',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
  },
  dateLabel: {
    width: 100,
    height: 30,
    backgroundColor: '#EFF6FF',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 6,
    text: new Date().toLocaleDateString('zh-CN'),
    fontSize: 12,
    fontColor: '#1D4ED8',
    letterSpacing: 0,
  },
}

interface ElementManagerState {
  elements: CanvasElement[]
  selectedIds: string[]
  guideLines: GuideLine[]
  paperSize: PaperSize
  showGrid: boolean
  undoStack: CanvasElement[][]
  redoStack: CanvasElement[][]
  templates: Template[]
}

interface ElementManagerActions {
  addElement: (type: ElementType, x: number, y: number) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  deleteElements: (ids: string[]) => void
  selectElement: (id: string, multi?: boolean) => void
  deselectAll: () => void
  toggleElementLock: (id: string) => void
  alignSelected: (alignment: 'top' | 'bottom' | 'left' | 'right' | 'centerH' | 'centerV') => void
  undo: () => void
  redo: () => void
  setPaperSize: (size: PaperSize) => void
  toggleGrid: () => void
  addGuideLine: (orientation: 'horizontal' | 'vertical', position: number) => void
  removeGuideLine: (id: string) => void
  saveTemplate: (name: string) => void
  loadTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
}

type ElementManagerStore = ElementManagerState & ElementManagerActions

function loadTemplates(): Template[] {
  try {
    const data = localStorage.getItem('journal-templates')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function persistTemplates(templates: Template[]) {
  localStorage.setItem('journal-templates', JSON.stringify(templates))
}

export const useElementManager = create<ElementManagerStore>((set, get) => ({
  elements: [],
  selectedIds: [],
  guideLines: [],
  paperSize: 'A5',
  showGrid: true,
  undoStack: [],
  redoStack: [],
  templates: loadTemplates(),

  addElement: (type, x, y) => {
    const state = get()
    const defaults = ELEMENT_DEFAULTS[type]
    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type,
      x,
      y,
      width: defaults.width ?? 100,
      height: defaults.height ?? 100,
      rotation: 0,
      backgroundColor: defaults.backgroundColor ?? 'transparent',
      borderStyle: defaults.borderStyle ?? 'solid',
      borderWidth: defaults.borderWidth ?? 0,
      borderColor: defaults.borderColor ?? '#000000',
      borderRadius: defaults.borderRadius ?? 0,
      locked: false,
      ...(defaults.text !== undefined ? { text: defaults.text } : {}),
      ...(defaults.fontSize !== undefined ? { fontSize: defaults.fontSize } : {}),
      ...(defaults.fontColor !== undefined ? { fontColor: defaults.fontColor } : {}),
      ...(defaults.letterSpacing !== undefined ? { letterSpacing: defaults.letterSpacing } : {}),
    }
    set({
      elements: [...state.elements, newElement],
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })
  },

  updateElement: (id, updates) => {
    const state = get()
    set({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })
  },

  deleteElements: (ids) => {
    const state = get()
    const idSet = new Set(ids)
    set({
      elements: state.elements.filter((el) => !idSet.has(el.id)),
      selectedIds: state.selectedIds.filter((sid) => !idSet.has(sid)),
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })
  },

  selectElement: (id, multi) => {
    if (multi) {
      set((state) => {
        const isSelected = state.selectedIds.includes(id)
        return {
          selectedIds: isSelected
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        }
      })
    } else {
      set({ selectedIds: [id] })
    }
  },

  deselectAll: () => set({ selectedIds: [] }),

  toggleElementLock: (id) => {
    const state = get()
    set({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: !el.locked } : el
      ),
    })
  },

  alignSelected: (alignment) => {
    const state = get()
    if (state.selectedIds.length < 2) return
    const selected = state.elements.filter(
      (el) => state.selectedIds.includes(el.id) && !el.locked
    )
    if (selected.length < 2) return
    let updated = [...state.elements]
    const alignableIds = new Set(selected.map((el) => el.id))
    switch (alignment) {
      case 'top': {
        const minY = Math.min(...selected.map((el) => el.y))
        updated = updated.map((el) =>
          alignableIds.has(el.id) ? { ...el, y: minY } : el
        )
        break
      }
      case 'bottom': {
        const maxBottom = Math.max(...selected.map((el) => el.y + el.height))
        updated = updated.map((el) =>
          alignableIds.has(el.id)
            ? { ...el, y: maxBottom - el.height }
            : el
        )
        break
      }
      case 'left': {
        const minX = Math.min(...selected.map((el) => el.x))
        updated = updated.map((el) =>
          alignableIds.has(el.id) ? { ...el, x: minX } : el
        )
        break
      }
      case 'right': {
        const maxRight = Math.max(...selected.map((el) => el.x + el.width))
        updated = updated.map((el) =>
          alignableIds.has(el.id)
            ? { ...el, x: maxRight - el.width }
            : el
        )
        break
      }
      case 'centerH': {
        const avgCenterX =
          selected.reduce((sum, el) => sum + el.x + el.width / 2, 0) /
          selected.length
        updated = updated.map((el) =>
          alignableIds.has(el.id)
            ? { ...el, x: avgCenterX - el.width / 2 }
            : el
        )
        break
      }
      case 'centerV': {
        const avgCenterY =
          selected.reduce((sum, el) => sum + el.y + el.height / 2, 0) /
          selected.length
        updated = updated.map((el) =>
          alignableIds.has(el.id)
            ? { ...el, y: avgCenterY - el.height / 2 }
            : el
        )
        break
      }
    }
    set({
      elements: updated,
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const previous = state.undoStack[state.undoStack.length - 1]
    set({
      elements: previous,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, state.elements],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const next = state.redoStack[state.redoStack.length - 1]
    set({
      elements: next,
      undoStack: [...state.undoStack, state.elements],
      redoStack: state.redoStack.slice(0, -1),
    })
  },

  setPaperSize: (size) => set({ paperSize: size }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  addGuideLine: (orientation, position) => {
    set((state) => ({
      guideLines: [
        ...state.guideLines,
        { id: crypto.randomUUID(), orientation, position },
      ],
    }))
  },

  removeGuideLine: (id) => {
    set((state) => ({
      guideLines: state.guideLines.filter((gl) => gl.id !== id),
    }))
  },

  saveTemplate: (name) => {
    const state = get()
    const template: Template = {
      id: crypto.randomUUID(),
      name,
      paperSize: state.paperSize,
      elements: state.elements,
      thumbnail: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updatedTemplates = [...state.templates, template]
    persistTemplates(updatedTemplates)
    set({ templates: updatedTemplates })
  },

  loadTemplate: (id) => {
    const state = get()
    const template = state.templates.find((t) => t.id === id)
    if (!template) return
    set({
      elements: template.elements,
      paperSize: template.paperSize,
      selectedIds: [],
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })
  },

  deleteTemplate: (id) => {
    set((state) => {
      const updatedTemplates = state.templates.filter((t) => t.id !== id)
      persistTemplates(updatedTemplates)
      return { templates: updatedTemplates }
    })
  },
}))
