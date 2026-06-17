import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DayRecord, EmotionType } from '@/types'

interface EmotionState {
  records: DayRecord[]
}

type EmotionAction =
  | { type: 'ADD_RECORD'; payload: Omit<DayRecord, 'id'> }
  | { type: 'UPDATE_RECORD'; payload: DayRecord }
  | { type: 'DELETE_RECORD'; payload: string }
  | { type: 'SET_RECORDS'; payload: DayRecord[] }

const STORAGE_KEY = 'emotion-calendar-records'

const initialState: EmotionState = {
  records: []
}

function emotionReducer(state: EmotionState, action: EmotionAction): EmotionState {
  switch (action.type) {
    case 'SET_RECORDS':
      return { ...state, records: action.payload }
    case 'ADD_RECORD': {
      const existingIndex = state.records.findIndex(r => r.date === action.payload.date)
      if (existingIndex >= 0) {
        const updated = [...state.records]
        updated[existingIndex] = { ...updated[existingIndex], ...action.payload }
        return { ...state, records: updated }
      }
      return {
        ...state,
        records: [...state.records, { ...action.payload, id: uuidv4() }]
      }
    }
    case 'UPDATE_RECORD': {
      const updated = state.records.map(r =>
        r.id === action.payload.id ? action.payload : r
      )
      return { ...state, records: updated }
    }
    case 'DELETE_RECORD': {
      const filtered = state.records.filter(r => r.id !== action.payload)
      return { ...state, records: filtered }
    }
    default:
      return state
  }
}

interface EmotionContextType {
  records: DayRecord[]
  addOrUpdateRecord: (date: string, emotion: EmotionType, memo?: string) => void
  deleteRecord: (id: string) => void
  getRecordByDate: (date: string) => DayRecord | undefined
  getMonthRecords: (year: number, month: number) => DayRecord[]
}

const EmotionContext = createContext<EmotionContextType | undefined>(undefined)

export function EmotionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(emotionReducer, initialState)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        dispatch({ type: 'SET_RECORDS', payload: parsed })
      } catch (e) {
        console.error('Failed to parse emotion records from localStorage', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records))
  }, [state.records])

  const addOrUpdateRecord = (date: string, emotion: EmotionType, memo?: string) => {
    dispatch({ type: 'ADD_RECORD', payload: { date, emotion, memo } })
  }

  const deleteRecord = (id: string) => {
    dispatch({ type: 'DELETE_RECORD', payload: id })
  }

  const getRecordByDate = (date: string): DayRecord | undefined => {
    return state.records.find(r => r.date === date)
  }

  const getMonthRecords = (year: number, month: number): DayRecord[] => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    return state.records.filter(r => r.date.startsWith(monthStr))
  }

  return (
    <EmotionContext.Provider
      value={{
        records: state.records,
        addOrUpdateRecord,
        deleteRecord,
        getRecordByDate,
        getMonthRecords
      }}
    >
      {children}
    </EmotionContext.Provider>
  )
}

export function useEmotion() {
  const context = useContext(EmotionContext)
  if (context === undefined) {
    throw new Error('useEmotion must be used within an EmotionProvider')
  }
  return context
}
