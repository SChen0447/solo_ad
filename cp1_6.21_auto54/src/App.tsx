import { useReducer, useEffect, createContext, useContext, useMemo, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { useApi } from './hooks/useApi'
import type { AppState, AppAction, Group, SplitResult, RenewalReminder } from './types'
import Dashboard from './components/Dashboard'
import SubscriptionDetail from './components/SubscriptionDetail'
import CreateGroup from './components/CreateGroup'
import Navbar from './components/Navbar'

const initialState: AppState = {
  group: null,
  currentMemberId: null,
  splitData: [],
  reminders: [],
  loading: false,
  error: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_GROUP':
      return { ...state, group: action.payload, loading: false }
    case 'SET_CURRENT_MEMBER':
      return { ...state, currentMemberId: action.payload }
    case 'SET_SPLIT_DATA':
      return { ...state, splitData: action.payload }
    case 'SET_REMINDERS':
      return { ...state, reminders: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'ADD_SUBSCRIPTION':
      if (!state.group) return state
      return {
        ...state,
        group: {
          ...state.group,
          subscriptions: [...state.group.subscriptions, action.payload],
        },
      }
    case 'UPDATE_SUBSCRIPTION':
      if (!state.group) return state
      return {
        ...state,
        group: {
          ...state.group,
          subscriptions: state.group.subscriptions.map((s) =>
            s.id === action.payload.id ? action.payload : s
          ),
        },
      }
    case 'DELETE_SUBSCRIPTION':
      if (!state.group) return state
      return {
        ...state,
        group: {
          ...state.group,
          subscriptions: state.group.subscriptions.filter((s) => s.id !== action.payload),
        },
      }
    case 'ADD_PAYMENT':
      if (!state.group) return state
      return {
        ...state,
        group: {
          ...state.group,
          subscriptions: state.group.subscriptions.map((s) => {
            if (s.id !== action.payload.subscriptionId) return s
            return {
              ...s,
              status: 'active',
              paymentHistory: [...s.paymentHistory, action.payload.payment],
            }
          }),
        },
      }
    case 'UPDATE_MEMBERS_STATUS':
      if (!state.group) return state
      return {
        ...state,
        group: {
          ...state.group,
          subscriptions: state.group.subscriptions.map((s) => {
            if (s.id !== action.payload.subscriptionId) return s
            return {
              ...s,
              members: s.members.map((m) => {
                if (!action.payload.memberIds.includes(m.memberId)) return m
                return {
                  ...m,
                  active: action.payload.active,
                  remainingDays: action.payload.active ? 30 : 0,
                  activatedDate: action.payload.active ? new Date().toISOString() : m.activatedDate,
                }
              }),
            }
          }),
        },
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  currentMemberId: string | null
  setCurrentMemberId: (id: string) => void
  loadGroupData: (groupId: string) => Promise<void>
  refreshSplitData: (groupId: string) => Promise<void>
  refreshReminders: (groupId: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const api = useApi()
  const navigate = useNavigate()

  const currentMemberId = useMemo(() => {
    return state.currentMemberId || localStorage.getItem('currentMemberId')
  }, [state.currentMemberId])

  const setCurrentMemberId = useCallback((id: string) => {
    dispatch({ type: 'SET_CURRENT_MEMBER', payload: id })
    localStorage.setItem('currentMemberId', id)
  }, [])

  const loadGroupData = useCallback(async (groupId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const group = await api.getGroup(groupId)
      dispatch({ type: 'SET_GROUP', payload: group })
      await refreshSplitData(groupId)
      await refreshReminders(groupId)
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '加载数据失败' })
    }
  }, [api])

  const refreshSplitData = useCallback(async (groupId: string) => {
    try {
      const data = await api.getSplitData(groupId)
      dispatch({ type: 'SET_SPLIT_DATA', payload: data })
    } catch (err: any) {
      console.error('Failed to load split data:', err)
    }
  }, [api])

  const refreshReminders = useCallback(async (groupId: string) => {
    try {
      const data = await api.getReminders(groupId)
      dispatch({ type: 'SET_REMINDERS', payload: data })
    } catch (err: any) {
      console.error('Failed to load reminders:', err)
    }
  }, [api])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      currentMemberId,
      setCurrentMemberId,
      loadGroupData,
      refreshSplitData,
      refreshReminders,
    }),
    [state, currentMemberId, setCurrentMemberId, loadGroupData, refreshSplitData, refreshReminders]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { loadGroupData, state } = useApp()

  useEffect(() => {
    if (groupId) {
      loadGroupData(groupId)
    }
  }, [groupId, loadGroupData])

  if (state.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="container">
        <div className="error-message">{state.error}</div>
      </div>
    )
  }

  if (!state.group) {
    return null
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subscription/:subscriptionId" element={<SubscriptionDetail />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/create" replace />} />
        <Route path="/create" element={<CreateGroup />} />
        <Route path="/group/:groupId/*" element={<GroupPage />} />
      </Routes>
    </AppProvider>
  )
}
