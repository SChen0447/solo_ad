import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useReducer, useCallback, createContext, useContext } from 'react'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'
import HomePage from '@/pages/HomePage'
import CreateActivityPage from '@/pages/CreateActivityPage'
import ActivityDetailPage from '@/pages/ActivityDetailPage'
import ProfilePage from '@/pages/ProfilePage'

type ActivityType = '运动' | '音乐' | '读书' | '桌游' | '户外' | '美食'

interface Registration {
  id: string
  userId: string
  userName: string
  avatarColor: string
  registeredAt: string
}

interface Comment {
  id: string
  activityId: string
  userId: string
  userName: string
  avatarColor: string
  content: string
  createdAt: string
}

export interface Activity {
  id: string
  title: string
  description: string
  time: string
  location: string
  maxParticipants: number
  type: ActivityType
  coverColor: string
  createdAt: string
  registrations: Registration[]
  likes: string[]
  comments: Comment[]
  creatorId: string
}

interface User {
  id: string
  name: string
  avatarColor: string
}

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
  exiting?: boolean
}

interface AppState {
  activities: Activity[]
  currentUser: User
  toasts: ToastItem[]
  loading: boolean
}

type AppAction =
  | { type: 'SET_ACTIVITIES'; payload: Activity[] }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_ACTIVITY'; payload: Activity }
  | { type: 'ADD_TOAST'; payload: ToastItem }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVITIES':
      return { ...state, activities: action.payload, loading: false }
    case 'ADD_ACTIVITY':
      return { ...state, activities: [action.payload, ...state.activities] }
    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        activities: state.activities.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  showToast: (message: string, type?: 'success' | 'error') => void
  fetchActivities: () => Promise<void>
  updateActivity: (activity: Activity) => void
}

export const AppContext = createContext<AppContextType | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

const initialState: AppState = {
  activities: [],
  currentUser: { id: 'current-user', name: '我', avatarColor: '#FF6B6B' },
  toasts: [],
  loading: true,
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString()
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } })
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id })
    }, 3000)
  }, [])

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activities')
      const data = await res.json()
      dispatch({ type: 'SET_ACTIVITIES', payload: data })
    } catch {
      showToast('加载活动列表失败', 'error')
    }
  }, [showToast])

  const updateActivity = useCallback((activity: Activity) => {
    dispatch({ type: 'UPDATE_ACTIVITY', payload: activity })
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const contextValue: AppContextType = {
    state,
    dispatch,
    showToast,
    fetchActivities,
    updateActivity,
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <Navbar />
        <main className="main-content">
          <PageTransition>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateActivityPage />} />
              <Route path="/activity/:id" element={<ActivityDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </PageTransition>
        </main>
        <Toast toasts={state.toasts} dispatch={dispatch} />
      </Router>
    </AppContext.Provider>
  )
}
