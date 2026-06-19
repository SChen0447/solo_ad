export interface User {
  id: string
  name: string
  avatar: string
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  createdAt: number
}

export interface Activity {
  id: string
  title: string
  description: string
  time: number
  location: string
  maxParticipants: number
  participants: User[]
  type: string
  tags?: string[]
  likes: number
  likedBy: string[]
  favorites: string[]
  comments: Comment[]
  createdAt: number
  coverColor: string
}

export interface AppState {
  activities: Activity[]
  currentUser: User
  loading: boolean
  toast: ToastState | null
}

export interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  id: string
}

export type Action =
  | { type: 'SET_ACTIVITIES'; payload: Activity[] }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_ACTIVITY'; payload: Activity }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOAST'; payload: ToastState | null }
  | { type: 'ADD_COMMENT'; payload: { activityId: string; comment: Comment } }
