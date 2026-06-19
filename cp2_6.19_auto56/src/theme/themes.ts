import type { Theme, ThemeId } from '../types'

export const themes: Record<ThemeId, Theme> = {
  ocean: {
    id: 'ocean',
    name: '海洋蓝',
    primary: '#0ea5e9',
    background: '#f0f9ff',
    canvasBackground: '#ffffff',
    textColors: ['#0369a1', '#0891b2', '#0284c7', '#0ea5e9', '#38bdf8'],
    accent: '#7dd3fc'
  },
  forest: {
    id: 'forest',
    name: '森林绿',
    primary: '#22c55e',
    background: '#f0fdf4',
    canvasBackground: '#ffffff',
    textColors: ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac'],
    accent: '#86efac'
  },
  sunset: {
    id: 'sunset',
    name: '日落橙',
    primary: '#f97316',
    background: '#fff7ed',
    canvasBackground: '#ffffff',
    textColors: ['#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'],
    accent: '#fdba74'
  },
  sakura: {
    id: 'sakura',
    name: '樱花粉',
    primary: '#ec4899',
    background: '#fdf2f8',
    canvasBackground: '#ffffff',
    textColors: ['#be185d', '#db2777', '#ec4899', '#f472b6', '#f9a8d4'],
    accent: '#f9a8d4'
  },
  dark: {
    id: 'dark',
    name: '暗夜黑',
    primary: '#a78bfa',
    background: '#1e1e2e',
    canvasBackground: '#2a2a3e',
    textColors: ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'],
    accent: '#8b5cf6'
  }
}

export const themeList: Theme[] = Object.values(themes)

export const getTheme = (id: ThemeId): Theme => themes[id]
