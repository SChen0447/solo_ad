export interface Plant {
  id: string
  name: string
  species: string
  waterFrequency: number
  fertilizeFrequency: number
  repotDate?: string
  lastWatered?: string
  lastFertilized?: string
  lastRepotted?: string
  nextCareDays?: number | null
  createdAt: string
  updatedAt?: string
}

export interface Task {
  id: string
  plantId: string
  plantName: string
  type: 'water' | 'fertilize' | 'repot'
  typeLabel: string
  date: string
  completed: boolean
  note: string
  createdAt: string
  updatedAt?: string
}

export interface TasksResponse {
  today: Task[]
  future: Task[]
  history: Task[]
}

export type SpeciesEmoji = Record<string, string>

export type GradientColor = {
  from: string
  to: string
}

export type SpeciesColors = Record<string, GradientColor>

export type SortOrder = 'asc' | 'desc'
