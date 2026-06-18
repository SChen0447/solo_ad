export type SpectrumStyle = 'bar' | 'wave' | 'particle'

export type BackgroundPreset = 'aurora' | 'neon' | 'starry' | 'sunset'

export type NoiseDensity = 'low' | 'medium' | 'high'

export interface AudioState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  fileName: string | null
  fileSize: number | null
}

export interface SpectrumData {
  frequencyData: Uint8Array
  fftSize: number
  barCount: number
}

export interface BackgroundConfig {
  preset: BackgroundPreset
  hueShift: number
  noiseEnabled: boolean
  noiseDensity: NoiseDensity
}

export interface PresetConfig {
  id: string
  name: string
  style: SpectrumStyle
  background: BackgroundConfig
}

export interface AppState {
  audio: AudioState
  spectrum: SpectrumData
  currentStyle: SpectrumStyle
  background: BackgroundConfig
  presets: PresetConfig[]
  selectedPresetId: string | null
  isPanelCollapsed: boolean
  isExporting: boolean
  exportProgress: number
}
