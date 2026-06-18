import { create } from 'zustand'
import { TypographyParams, DEFAULT_PARAMS } from './FontEngine'
import { FontMetadata } from './FontParser'

export type TemplateType = 'title' | 'paragraph' | 'code'

export interface ColorTheme {
  id: string
  name: string
  background: string
  foreground: string
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'cream', name: '米白', background: '#FAF8F5', foreground: '#2C2C2C' },
  { id: 'lightgray', name: '浅灰', background: '#F0F2F5', foreground: '#1F2937' },
  { id: 'lightblue', name: '淡蓝', background: '#E8F0FE', foreground: '#1E3A5F' },
  { id: 'mint', name: '薄荷', background: '#E6F4F1', foreground: '#1E4A42' },
  { id: 'lavender', name: '薰衣草', background: '#F3EDFB', foreground: '#3D2C5C' },
  { id: 'peach', name: '桃色', background: '#FDEDE4', foreground: '#5C2C1E' },
  { id: 'sand', name: '沙色', background: '#F5F0E6', foreground: '#433520' },
  { id: 'dark', name: '深灰', background: '#2A2A2E', foreground: '#E8E8EC' }
]

export interface AppState {
  fontMetadata: FontMetadata | null
  fontFamilyKey: string | null
  fontLoading: boolean
  fontLoadProgress: number
  fontLoadError: string | null
  params: TypographyParams
  templateType: TemplateType
  colorTheme: ColorTheme
  drawerOpen: boolean

  setFontLoading: (loading: boolean) => void
  setFontLoadProgress: (progress: number) => void
  setFontLoadError: (error: string | null) => void
  setFont: (metadata: FontMetadata, familyKey: string) => void
  updateParam: <K extends keyof TypographyParams>(key: K, value: TypographyParams[K]) => void
  resetParams: () => void
  setTemplateType: (type: TemplateType) => void
  setColorTheme: (theme: ColorTheme) => void
  toggleDrawer: () => void
  setDrawerOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  fontMetadata: null,
  fontFamilyKey: null,
  fontLoading: false,
  fontLoadProgress: 0,
  fontLoadError: null,
  params: { ...DEFAULT_PARAMS },
  templateType: 'paragraph',
  colorTheme: COLOR_THEMES[0],
  drawerOpen: false,

  setFontLoading: (loading) => set({ fontLoading: loading, fontLoadProgress: loading ? 0 : 100 }),
  setFontLoadProgress: (progress) => set({ fontLoadProgress: progress }),
  setFontLoadError: (error) => set({ fontLoadError: error, fontLoading: false }),
  setFont: (metadata, familyKey) => set({
    fontMetadata: metadata,
    fontFamilyKey: familyKey,
    fontLoading: false,
    fontLoadProgress: 100,
    fontLoadError: null,
    params: {
      ...DEFAULT_PARAMS,
      fontWeight: metadata.weight
    }
  }),
  updateParam: (key, value) => set((state) => ({
    params: { ...state.params, [key]: value }
  })),
  resetParams: () => set((state) => ({
    params: {
      ...DEFAULT_PARAMS,
      fontWeight: state.fontMetadata?.weight ?? DEFAULT_PARAMS.fontWeight
    }
  })),
  setTemplateType: (type) => set({ templateType: type }),
  setColorTheme: (theme) => set({ colorTheme: theme }),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
  setDrawerOpen: (open) => set({ drawerOpen: open })
}))
