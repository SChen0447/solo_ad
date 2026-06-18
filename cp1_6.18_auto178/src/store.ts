import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  SpectrumStyle,
  BackgroundConfig,
  PresetConfig,
  AudioState,
  SpectrumData,
} from './types'

interface AppStore {
  audio: AudioState
  spectrum: SpectrumData
  currentStyle: SpectrumStyle
  background: BackgroundConfig
  presets: PresetConfig[]
  selectedPresetId: string | null
  isPanelCollapsed: boolean
  isExporting: boolean
  exportProgress: number

  setAudioState: (state: Partial<AudioState>) => void
  setSpectrumData: (data: Uint8Array) => void
  setStyle: (style: SpectrumStyle) => void
  setBackground: (config: Partial<BackgroundConfig>) => void
  addPreset: (name: string) => void
  deletePreset: (id: string) => void
  selectPreset: (id: string) => void
  updatePresetName: (id: string, name: string) => void
  togglePanel: () => void
  setExporting: (isExporting: boolean) => void
  setExportProgress: (progress: number | ((prev: number) => number)) => void
}

const initialFrequencyData = new Uint8Array(256)

const initialBackground: BackgroundConfig = {
  preset: 'aurora',
  hueShift: 0,
  noiseEnabled: false,
  noiseDensity: 'medium',
}

const initialAudio: AudioState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 70,
  fileName: null,
  fileSize: null,
}

const initialSpectrum: SpectrumData = {
  frequencyData: initialFrequencyData,
  fftSize: 512,
  barCount: 256,
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      audio: initialAudio,
      spectrum: initialSpectrum,
      currentStyle: 'bar',
      background: initialBackground,
      presets: [],
      selectedPresetId: null,
      isPanelCollapsed: false,
      isExporting: false,
      exportProgress: 0,

      setAudioState: (state) =>
        set((prev) => ({
          audio: { ...prev.audio, ...state },
        })),

      setSpectrumData: (data) =>
        set(() => ({
          spectrum: {
            frequencyData: data,
            fftSize: 512,
            barCount: 256,
          },
        })),

      setStyle: (style) => {
        set({ currentStyle: style, selectedPresetId: null })
      },

      setBackground: (config) => {
        set((prev) => ({
          background: { ...prev.background, ...config },
          selectedPresetId: null,
        }))
      },

      addPreset: (name) => {
        const { presets, currentStyle, background } = get()
        if (presets.length >= 5) return

        const newPreset: PresetConfig = {
          id: `preset-${Date.now()}`,
          name: name.slice(0, 10),
          style: currentStyle,
          background: { ...background },
        }

        set({
          presets: [...presets, newPreset],
          selectedPresetId: newPreset.id,
        })
      },

      deletePreset: (id) => {
        const { presets, selectedPresetId } = get()
        set({
          presets: presets.filter((p) => p.id !== id),
          selectedPresetId: selectedPresetId === id ? null : selectedPresetId,
        })
      },

      selectPreset: (id) => {
        const { presets } = get()
        const preset = presets.find((p) => p.id === id)
        if (!preset) return

        set({
          currentStyle: preset.style,
          background: { ...preset.background },
          selectedPresetId: id,
        })
      },

      updatePresetName: (id, name) => {
        set((prev) => ({
          presets: prev.presets.map((p) =>
            p.id === id ? { ...p, name: name.slice(0, 10) } : p
          ),
        }))
      },

      togglePanel: () =>
        set((prev) => ({
          isPanelCollapsed: !prev.isPanelCollapsed,
        })),

      setExporting: (isExporting) => set({ isExporting }),

      setExportProgress: (progress) =>
        set((state) => ({
          exportProgress: typeof progress === 'function' ? progress(state.exportProgress) : progress,
        })),
    }),
    {
      name: 'music-visualizer-presets',
      partialize: (state) => ({
        presets: state.presets,
        background: state.background,
        currentStyle: state.currentStyle,
        isPanelCollapsed: state.isPanelCollapsed,
      }),
    }
  )
)
