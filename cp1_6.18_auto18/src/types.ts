export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'surprised' | 'loved'

export interface MoodEntry {
  id: string
  mood: MoodType
  lat: number
  lng: number
  location: string
  timestamp: number
}

export interface LatLng {
  lat: number
  lng: number
}

export interface HeatmapPoint extends LatLng {
  intensity: number
  mood: MoodType
  count: number
}
