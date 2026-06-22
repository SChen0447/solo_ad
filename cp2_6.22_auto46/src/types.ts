export type CuisineType = 'chinese' | 'western' | 'japanese' | 'other'

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
}

export interface Step {
  id: string
  stepNumber: number
  description: string
  estimatedTime: number
  completed: boolean
  actualTime?: number
}

export interface Recipe {
  id: string
  name: string
  cuisine: CuisineType
  ingredients: Ingredient[]
  steps: Step[]
  assignee?: string
  completed?: boolean
}

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  purchased: boolean
}

export interface Notification {
  id: string
  type: 'success' | 'info' | 'warning'
  message: string
  visible: boolean
}

export interface FloatingTip {
  id: string
  title: string
  description: string
  visible: boolean
}
