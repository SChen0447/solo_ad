import { create } from 'zustand'
import {
  normalizeHex,
  isValidHex,
  generateRandomColor,
  getReadableTextColor,
  calculateContrast,
  getComponentName
} from './utils'

export interface PaletteColor {
  id: string
  name: string
  hex: string
}

export interface HistoryRecord {
  id: string
  timestamp: number
  type: 'color-add' | 'color-edit' | 'color-reorder' | 'color-delete' | 'component-apply' | 'bulk'
  description: string
  beforeColors: PaletteColor[]
  afterColors: PaletteColor[]
  beforeComponentColors: Record<string, string>
  afterComponentColors: Record<string, string>
  revertible: boolean
}

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375
}

export const DEFAULT_COMPONENT_COLORS: Record<string, string> = {
  'navbar-bg': '#343A40',
  'navbar-text': '#FFFFFF',
  'hero-bg': '#F8F9FA',
  'hero-text': '#212529',
  'hero-subtext': '#6C757D',
  'button-bg': '#007BFF',
  'button-text': '#FFFFFF',
  'card-bg': '#FFFFFF',
  'card-title': '#212529',
  'card-text': '#6C757D',
  'card-border': '#DEE2E6',
  'footer-bg': '#343A40',
  'footer-text': '#FFFFFF',
  'accent': '#007BFF'
}

const DEFAULT_PALETTE: PaletteColor[] = [
  { id: 'c1', name: '主色调', hex: '#007BFF' },
  { id: 'c2', name: '深色导航', hex: '#343A40' },
  { id: 'c3', name: '文字黑', hex: '#212529' },
  { id: 'c4', name: '辅助灰', hex: '#6C757D' },
  { id: 'c5', name: '背景白', hex: '#FFFFFF' },
  { id: 'c6', name: '浅灰白', hex: '#F8F9FA' },
  { id: 'c7', name: '分割线', hex: '#DEE2E6' },
  { id: 'c8', name: '成功绿', hex: '#28A745' },
  { id: 'c9', name: '警告黄', hex: '#FFC107' },
  { id: 'c10', name: '危险红', hex: '#DC3545' }
]

interface AppState {
  palette: PaletteColor[]
  componentColors: Record<string, string>
  history: HistoryRecord[]
  historyIndex: number
  breakpoint: Breakpoint

  addColor: (hex?: string, name?: string) => void
  editColor: (id: string, hex: string, name?: string) => void
  deleteColor: (id: string) => void
  reorderColors: (fromIndex: number, toIndex: number) => void

  applyColorToComponent: (componentKey: string, hex: string) => void
  resetComponentColors: () => void

  setBreakpoint: (bp: Breakpoint) => void

  undoToHistory: (recordId: string) => void
  clearHistory: () => void
}

let idCounter = 100
const genId = () => `c${++idCounter}`
const genHistoryId = () => `h${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function createHistoryRecord(
  state: AppState,
  type: HistoryRecord['type'],
  description: string,
  afterColors: PaletteColor[],
  afterComponentColors: Record<string, string>
): HistoryRecord {
  return {
    id: genHistoryId(),
    timestamp: Date.now(),
    type,
    description,
    beforeColors: JSON.parse(JSON.stringify(state.palette)),
    afterColors: JSON.parse(JSON.stringify(afterColors)),
    beforeComponentColors: JSON.parse(JSON.stringify(state.componentColors)),
    afterComponentColors: JSON.parse(JSON.stringify(afterComponentColors)),
    revertible: true
  }
}

export const useStore = create<AppState>((set, get) => ({
  palette: DEFAULT_PALETTE,
  componentColors: { ...DEFAULT_COMPONENT_COLORS },
  history: [],
  historyIndex: -1,
  breakpoint: 'desktop',

  addColor: (hex?: string, name?: string) => {
    const state = get()
    const newHex = hex ? (isValidHex(hex) ? normalizeHex(hex) : generateRandomColor()) : generateRandomColor()
    const newColor: PaletteColor = {
      id: genId(),
      name: name || `颜色 ${state.palette.length + 1}`,
      hex: newHex
    }
    const afterColors = [...state.palette, newColor]
    const record = createHistoryRecord(
      state,
      'color-add',
      `添加颜色 ${newColor.name} (${newColor.hex})`,
      afterColors,
      state.componentColors
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      palette: afterColors,
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  editColor: (id: string, hex: string, name?: string) => {
    const state = get()
    if (!isValidHex(hex)) return
    const normalizedHex = normalizeHex(hex)
    const idx = state.palette.findIndex(c => c.id === id)
    if (idx === -1) return

    const oldColor = state.palette[idx]
    const newName = name !== undefined ? name : oldColor.name
    const afterColors = state.palette.map(c =>
      c.id === id ? { ...c, hex: normalizedHex, name: newName } : c
    )

    const oldHexComp = Object.fromEntries(
      Object.entries(state.componentColors).filter(([, v]) => v === oldColor.hex)
    )
    const afterComponentColors = { ...state.componentColors }
    Object.keys(oldHexComp).forEach(k => {
      afterComponentColors[k] = normalizedHex
    })

    const compList = Object.keys(oldHexComp).map(getComponentName).join('、') || '无'
    const record = createHistoryRecord(
      state,
      'color-edit',
      `编辑颜色: ${oldColor.name} ${oldColor.hex} → ${newName} ${normalizedHex} (影响组件: ${compList})`,
      afterColors,
      afterComponentColors
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      palette: afterColors,
      componentColors: afterComponentColors,
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  deleteColor: (id: string) => {
    const state = get()
    const idx = state.palette.findIndex(c => c.id === id)
    if (idx === -1) return
    const deleted = state.palette[idx]
    const afterColors = state.palette.filter(c => c.id !== id)
    const record = createHistoryRecord(
      state,
      'color-delete',
      `删除颜色 ${deleted.name} (${deleted.hex})`,
      afterColors,
      state.componentColors
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      palette: afterColors,
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  reorderColors: (fromIndex: number, toIndex: number) => {
    const state = get()
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= state.palette.length) return
    if (toIndex < 0 || toIndex >= state.palette.length) return
    const afterColors = [...state.palette]
    const [moved] = afterColors.splice(fromIndex, 1)
    afterColors.splice(toIndex, 0, moved)
    const record = createHistoryRecord(
      state,
      'color-reorder',
      `调整顺序: ${moved.name} 从位置 ${fromIndex + 1} 移到 ${toIndex + 1}`,
      afterColors,
      state.componentColors
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      palette: afterColors,
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  applyColorToComponent: (componentKey: string, hex: string) => {
    const state = get()
    if (!isValidHex(hex)) return
    const normalizedHex = normalizeHex(hex)
    const afterComponentColors = { ...state.componentColors }
    afterComponentColors[componentKey] = normalizedHex

    const relatedMap: Record<string, string[]> = {
      'navbar-bg': ['navbar-text'],
      'hero-bg': ['hero-text', 'hero-subtext'],
      'button-bg': ['button-text'],
      'card-bg': ['card-title', 'card-text'],
      'footer-bg': ['footer-text']
    }

    const related = relatedMap[componentKey] || []
    related.forEach(textKey => {
      afterComponentColors[textKey] = getReadableTextColor(normalizedHex)
    })

    if (componentKey === 'card-bg') {
      const borderContrast = calculateContrast(normalizedHex, afterComponentColors['card-border'])
      if (borderContrast.ratio < 1.5) {
        afterComponentColors['card-border'] = calculateContrast(normalizedHex, '#DEE2E6').ratio >= 1.5
          ? '#DEE2E6'
          : getReadableTextColor(normalizedHex, '#FFFFFF', '#212529') === '#FFFFFF' ? '#CCCCCC' : '#6C757D'
      }
    }

    const compName = getComponentName(componentKey)
    const record = createHistoryRecord(
      state,
      'component-apply',
      `应用颜色到 ${compName}: ${state.componentColors[componentKey]} → ${normalizedHex}`,
      state.palette,
      afterComponentColors
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      componentColors: afterComponentColors,
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  resetComponentColors: () => {
    const state = get()
    const record = createHistoryRecord(
      state,
      'bulk',
      '重置所有组件颜色为默认值',
      state.palette,
      DEFAULT_COMPONENT_COLORS
    )
    const newHistory = state.historyIndex >= 0
      ? state.history.slice(0, state.historyIndex + 1)
      : state.history
    set({
      componentColors: { ...DEFAULT_COMPONENT_COLORS },
      history: [...newHistory, record].slice(-50),
      historyIndex: Math.min(newHistory.length, 49)
    })
  },

  setBreakpoint: (bp: Breakpoint) => {
    set({ breakpoint: bp })
  },

  undoToHistory: (recordId: string) => {
    const state = get()
    const recordIdx = state.history.findIndex(r => r.id === recordId)
    if (recordIdx === -1) return

    const record = state.history[recordIdx]
    const newHistory = state.history.map((r, i) => ({
      ...r,
      revertible: i <= recordIdx
    }))

    set({
      palette: JSON.parse(JSON.stringify(record.beforeColors)),
      componentColors: JSON.parse(JSON.stringify(record.beforeComponentColors)),
      history: newHistory,
      historyIndex: recordIdx
    })
  },

  clearHistory: () => {
    set({ history: [], historyIndex: -1 })
  }
}))
