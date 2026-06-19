import { useReducer, useEffect, createContext, useContext } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import type { AppState, Action, Activity } from './types'
import { fetchActivities } from './api'
import { getCurrentUser } from './utils'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import HomePage from './pages/HomePage'
import CreateActivityPage from './pages/CreateActivityPage'
import ActivityDetailPage from './pages/ActivityDetailPage'
import ProfilePage from './pages/ProfilePage'

const initialState: AppState = {
  activities: [],
  currentUser: getCurrentUser(),
  loading: true,
  toast: null
}

const reducer = (state: AppState, action: Action): AppState => {
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
        )
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_TOAST':
      return { ...state, toast: action.payload }
    case 'ADD_COMMENT':
      return {
        ...state,
        activities: state.activities.map(a => {
          if (a.id === action.payload.activityId) {
            return {
              ...a,
              comments: [action.payload.comment, ...a.comments]
            }
          }
          return a
        })
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppProvider')
  return context
}

function AppContent() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await fetchActivities()
        dispatch({ type: 'SET_ACTIVITIES', payload: data })
      } catch (error) {
        dispatch({
          type: 'SET_TOAST',
          payload: {
            id: uuidv4(),
            message: '加载活动列表失败',
            type: 'error'
          }
        })
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    loadActivities()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = { id: uuidv4(), message, type }
    dispatch({ type: 'SET_TOAST', payload: toast })
    setTimeout(() => {
      dispatch({ type: 'SET_TOAST', payload: null })
    }, 3000)
  }

  const updateActivity = (activity: Activity) => {
    dispatch({ type: 'UPDATE_ACTIVITY', payload: activity })
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="app">
        <Navbar />
        <div key={location.pathname} className="page-enter page-enter-active">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateActivityPage onSuccess={showToast} />} />
            <Route path="/activity/:id" element={
              <ActivityDetailPage 
                onActivityUpdate={updateActivity}
                showToast={showToast}
              />
            } />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
        <Toast toast={state.toast} onClose={() => dispatch({ type: 'SET_TOAST', payload: null })} />
      </div>
    </AppContext.Provider>
  )
}

export default function App() {
  return <AppContent />
}
