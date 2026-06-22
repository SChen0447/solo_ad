import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Plant, PlantingPlan, GrowthRecord } from '@/types'
import { plantApi, planApi, recordApi } from '@/utils/api'

interface AppContextType {
  plants: Plant[]
  plans: PlantingPlan[]
  records: GrowthRecord[]
  loading: boolean
  refreshPlants: () => Promise<void>
  refreshPlans: () => Promise<void>
  refreshRecords: (planId?: string) => Promise<void>
  addPlant: (data: Omit<Plant, 'id'>) => Promise<void>
  addPlan: (data: Omit<PlantingPlan, 'id' | 'completedTasks'>) => Promise<void>
  addRecord: (data: Omit<GrowthRecord, 'id'>) => Promise<void>
  toggleTask: (planId: string, taskId: string) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [plans, setPlans] = useState<PlantingPlan[]>([])
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refreshPlants = useCallback(async () => {
    const data = await plantApi.getAll()
    setPlants(data)
  }, [])

  const refreshPlans = useCallback(async () => {
    const data = await planApi.getAll()
    setPlans(data)
  }, [])

  const refreshRecords = useCallback(async (planId?: string) => {
    const data = await recordApi.getAll(planId)
    if (planId) {
      setRecords((prev) => {
        const others = prev.filter((r) => r.planId !== planId)
        return [...others, ...data]
      })
    } else {
      setRecords(data)
    }
  }, [])

  const addPlant = useCallback(async (data: Omit<Plant, 'id'>) => {
    await plantApi.create(data)
    await refreshPlants()
  }, [refreshPlants])

  const addPlan = useCallback(async (data: Omit<PlantingPlan, 'id' | 'completedTasks'>) => {
    await planApi.create(data)
    await refreshPlans()
  }, [refreshPlans])

  const addRecord = useCallback(async (data: Omit<GrowthRecord, 'id'>) => {
    await recordApi.create(data)
    await refreshRecords(data.planId)
  }, [refreshRecords])

  const toggleTask = useCallback(async (planId: string, taskId: string) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    const completed = plan.completedTasks.includes(taskId)
      ? plan.completedTasks.filter((t) => t !== taskId)
      : [...plan.completedTasks, taskId]
    await planApi.update(planId, { completedTasks: completed })
    await refreshPlans()
  }, [plans, refreshPlans])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        await Promise.all([refreshPlants(), refreshPlans(), refreshRecords()])
      } catch (e) {
        console.error('Failed to load data:', e)
      }
      setLoading(false)
    }
    init()
  }, [refreshPlants, refreshPlans, refreshRecords])

  return (
    <AppContext.Provider
      value={{
        plants,
        plans,
        records,
        loading,
        refreshPlants,
        refreshPlans,
        refreshRecords,
        addPlant,
        addPlan,
        addRecord,
        toggleTask,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
