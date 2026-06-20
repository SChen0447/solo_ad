export type ColorMap = Record<string, string>

export interface ThemePreset {
  name: string
  label: string
  colors: ColorMap
}

export const DEFAULT_VARIABLES: ColorMap = {
  '--primary': '#89b4fa',
  '--secondary': '#cba6f7',
  '--accent': '#f9e2af',
  '--background': '#1e1e2e',
  '--text': '#cdd6f4',
  '--border': '#45475a',
  '--shadow': '#11111b',
  '--success': '#a6e3a1',
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'light',
    label: '亮色主题',
    colors: {
      '--primary': '#3b82f6',
      '--secondary': '#8b5cf6',
      '--accent': '#f59e0b',
      '--background': '#ffffff',
      '--text': '#1f2937',
      '--border': '#e5e7eb',
      '--shadow': '#d1d5db',
      '--success': '#10b981',
    },
  },
  {
    name: 'dark',
    label: '暗色主题',
    colors: {
      '--primary': '#89b4fa',
      '--secondary': '#cba6f7',
      '--accent': '#f9e2af',
      '--background': '#1e1e2e',
      '--text': '#cdd6f4',
      '--border': '#45475a',
      '--shadow': '#11111b',
      '--success': '#a6e3a1',
    },
  },
  {
    name: 'nature',
    label: '自然主题',
    colors: {
      '--primary': '#4ade80',
      '--secondary': '#84cc16',
      '--accent': '#eab308',
      '--background': '#1a2e1a',
      '--text': '#d1fae5',
      '--border': '#3d5a3d',
      '--shadow': '#0f1f0f',
      '--success': '#22c55e',
    },
  },
]

const MAX_HISTORY = 50
const MAX_VARIABLES = 12

type Listener = (colors: ColorMap) => void

export class ThemeManager {
  private colors: ColorMap
  private history: ColorMap[] = []
  private historyIndex: number = -1
  private listeners: Set<Listener> = new Set()

  constructor(initialColors: ColorMap = DEFAULT_VARIABLES) {
    this.colors = { ...initialColors }
    this.pushHistory()
  }

  private pushHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push({ ...this.colors })
    if (this.history.length > MAX_HISTORY) {
      this.history.shift()
    } else {
      this.historyIndex++
    }
  }

  getColors(): ColorMap {
    return { ...this.colors }
  }

  setVariable(name: string, value: string) {
    if (this.colors[name] === value) return
    this.colors[name] = value
    this.pushHistory()
    this.applyToDOM()
    this.notify()
  }

  setVariables(colors: ColorMap) {
    this.colors = { ...colors }
    this.pushHistory()
    this.applyToDOM()
    this.notify()
  }

  resetVariables() {
    this.colors = { ...DEFAULT_VARIABLES }
    this.pushHistory()
    this.applyToDOM()
    this.notify()
  }

  addVariable(name: string, value?: string): boolean {
    const varCount = Object.keys(this.colors).length
    if (varCount >= MAX_VARIABLES) return false
    if (this.colors[name] !== undefined) return false
    const finalName = name.startsWith('--') ? name : `--${name}`
    this.colors[finalName] = value || this.generateRandomColor()
    this.pushHistory()
    this.applyToDOM()
    this.notify()
    return true
  }

  removeVariable(name: string): boolean {
    if (!(name in this.colors)) return false
    delete this.colors[name]
    this.pushHistory()
    this.applyToDOM()
    this.notify()
    return true
  }

  canUndo(): boolean {
    return this.historyIndex > 0
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1
  }

  undo() {
    if (!this.canUndo()) return
    this.historyIndex--
    this.colors = { ...this.history[this.historyIndex] }
    this.applyToDOM()
    this.notify()
  }

  redo() {
    if (!this.canRedo()) return
    this.historyIndex++
    this.colors = { ...this.history[this.historyIndex] }
    this.applyToDOM()
    this.notify()
  }

  applyPreset(preset: ThemePreset) {
    this.colors = { ...preset.colors }
    this.pushHistory()
    this.applyToDOM()
    this.notify()
  }

  private applyToDOM() {
    const root = document.documentElement
    Object.entries(this.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }

  private generateRandomColor(): string {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.getColors()))
  }

  static getMaxVariables(): number {
    return MAX_VARIABLES
  }
}

export const themeManager = new ThemeManager()
