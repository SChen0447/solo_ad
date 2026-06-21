import { useState, useCallback } from 'react'

export type NoteType = 'top' | 'middle' | 'base'

export interface ScentItem {
  id: string
  name: string
  noteType: NoteType
  ratio: number
}

export function usePerfumeFormula() {
  const [scents, setScents] = useState<ScentItem[]>([])
  const [formulaName, setFormulaName] = useState<string>('')

  const addScent = useCallback((scent: Omit<ScentItem, 'ratio'>) => {
    setScents((prev) => {
      if (prev.find((s) => s.id === scent.id)) {
        return prev
      }
      return [...prev, { ...scent, ratio: 3 }]
    })
  }, [])

  const removeScent = useCallback((id: string) => {
    setScents((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const updateRatio = useCallback((id: string, ratio: number) => {
    setScents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ratio: Math.max(1, Math.min(10, ratio)) } : s))
    )
  }, [])

  const clearAll = useCallback(() => {
    setScents([])
    setFormulaName('')
  }, [])

  const totalRatio = scents.reduce((sum, s) => sum + s.ratio, 0)

  return {
    scents,
    formulaName,
    setFormulaName,
    addScent,
    removeScent,
    updateRatio,
    clearAll,
    totalRatio,
  }
}
