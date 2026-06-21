export interface Plant {
  id: string
  name: string
  species: string
  location: string
  lightNeeds: string
  imageUrl: string
  lastWatered: string
  createdAt: string
  careHistory: CareRecord[]
}

export interface CareRecord {
  id: string
  type: 'water' | 'fertilize' | 'repot'
  date: string
  note?: string
}

export interface Post {
  id: string
  author: string
  avatar: string
  time: string
  content: string
  likes: number
  liked: boolean
  comments: Comment[]
  saved: boolean
}

export interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  time: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  level: number
  stats: {
    totalPlants: number
    healthIndex: number
    careDays: number
  }
}
