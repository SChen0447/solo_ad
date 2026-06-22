export type PlantCategory = 'leaf' | 'fruit' | 'root'

export interface Plant {
  id: string
  name: string
  category: PlantCategory
  maturityDays: number
  waterFrequency: number
  fertilizeFrequency: number
  imageUrl: string
}

export interface PlantingPlan {
  id: string
  plantId: string
  plantName: string
  category: PlantCategory
  maturityDays: number
  waterFrequency: number
  fertilizeFrequency: number
  sowDate: string
  potCount: number
  completedTasks: string[]
}

export interface GrowthRecord {
  id: string
  planId: string
  date: string
  photoUrl?: string
  height?: number
  leafCount?: number
  notes?: string
}

export type TaskType = 'water' | 'fertilize' | 'harvest'

export interface Task {
  id: string
  planId: string
  plantName: string
  type: TaskType
  date: string
  completed: boolean
}
