import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type PlatformType = 'weibo' | 'xiaohongshu' | 'wechat'
export type ScheduleStatus = 'draft' | 'pending' | 'published'

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Material {
  id: string
  title: string
  content: string
  coverImage?: string
  images: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Schedule {
  id: string
  materialId: string
  material?: Material
  platform: PlatformType
  publishTime: string
  status: ScheduleStatus
  orderIndex: number
}

interface AppState {
  materials: Material[]
  schedules: Schedule[]
  tags: Tag[]
  selectedMaterialId: string | null
  selectedScheduleId: string | null
  searchKeyword: string
  filterTagId: string | null
  isLoading: boolean
  error: string | null
}

interface AppContextType extends AppState {
  setMaterials: (materials: Material[]) => void
  setSchedules: (schedules: Schedule[]) => void
  setTags: (tags: Tag[]) => void
  selectMaterial: (id: string | null) => void
  selectSchedule: (id: string | null) => void
  setSearchKeyword: (keyword: string) => void
  setFilterTagId: (id: string | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addMaterial: (material: Material) => void
  updateMaterial: (material: Material) => void
  deleteMaterial: (id: string) => void
  addSchedule: (schedule: Schedule) => void
  updateSchedule: (schedule: Schedule) => void
  deleteSchedule: (id: string) => void
  addTag: (tag: Tag) => void
}

const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    materials: [],
    schedules: [],
    tags: [
      { id: '1', name: '节日营销', color: '#E74C3C' },
      { id: '2', name: '新品上市', color: '#3498DB' },
      { id: '3', name: '品牌故事', color: '#27AE60' },
      { id: '4', name: '用户案例', color: '#9B59B6' },
    ],
    selectedMaterialId: null,
    selectedScheduleId: null,
    searchKeyword: '',
    filterTagId: null,
    isLoading: false,
    error: null,
  })

  const setMaterials = useCallback((materials: Material[]) => {
    setState(s => ({ ...s, materials }))
  }, [])

  const setSchedules = useCallback((schedules: Schedule[]) => {
    setState(s => ({ ...s, schedules }))
  }, [])

  const setTags = useCallback((tags: Tag[]) => {
    setState(s => ({ ...s, tags }))
  }, [])

  const selectMaterial = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedMaterialId: id }))
  }, [])

  const selectSchedule = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedScheduleId: id }))
  }, [])

  const setSearchKeyword = useCallback((keyword: string) => {
    setState(s => ({ ...s, searchKeyword: keyword }))
  }, [])

  const setFilterTagId = useCallback((id: string | null) => {
    setState(s => ({ ...s, filterTagId: id }))
  }, [])

  const setIsLoading = useCallback((loading: boolean) => {
    setState(s => ({ ...s, isLoading: loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(s => ({ ...s, error }))
  }, [])

  const addMaterial = useCallback((material: Material) => {
    setState(s => ({ ...s, materials: [material, ...s.materials] }))
  }, [])

  const updateMaterial = useCallback((material: Material) => {
    setState(s => ({
      ...s,
      materials: s.materials.map(m => (m.id === material.id ? material : m)),
    }))
  }, [])

  const deleteMaterial = useCallback((id: string) => {
    setState(s => ({
      ...s,
      materials: s.materials.filter(m => m.id !== id),
    }))
  }, [])

  const addSchedule = useCallback((schedule: Schedule) => {
    setState(s => ({ ...s, schedules: [...s.schedules, schedule] }))
  }, [])

  const updateSchedule = useCallback((schedule: Schedule) => {
    setState(s => ({
      ...s,
      schedules: s.schedules.map(sc => (sc.id === schedule.id ? schedule : sc)),
    }))
  }, [])

  const deleteSchedule = useCallback((id: string) => {
    setState(s => ({
      ...s,
      schedules: s.schedules.filter(sc => sc.id !== id),
    }))
  }, [])

  const addTag = useCallback((tag: Tag) => {
    setState(s => ({ ...s, tags: [...s.tags, tag] }))
  }, [])

  return (
    <AppContext.Provider
      value={{
        ...state,
        setMaterials,
        setSchedules,
        setTags,
        selectMaterial,
        selectSchedule,
        setSearchKeyword,
        setFilterTagId,
        setIsLoading,
        setError,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addTag,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
