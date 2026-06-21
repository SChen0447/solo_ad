export interface TimeMarker {
  id: string
  time: number
  label: string
}

export interface EnvelopePoint {
  id: string
  time: number
  volume: number
}

export interface FrequencyData {
  frequencies: Uint8Array
  waveform: Float32Array
  timestamp: number
}

export interface AudioState {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  fileName: string | null
}
