import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type {
  CreateItemInput,
  Filter,
  MediaItem,
  StatsData,
  UpdateItemInput,
  ViewMode
} from './types'
import { addItem, deleteItem, fetchItems, fetchStats, fetchTags, updateItem } from './api'

interface StoreValue {
  items: MediaItem[]
  stats: StatsData | null
  allTags: string[]
  filter: Filter
  viewMode: ViewMode
  loading: boolean
  filteredItems: MediaItem[]
  setFilter: (patch: Partial<Filter>) => void
  setViewMode: (mode: ViewMode) => void
  createItem: (input: CreateItemInput) => Promise<void>
  updateItemById: (id: string, input: UpdateItemInput) => Promise<void>
  deleteItemById: (id: string) => Promise<void>
  refreshAll: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

const DEFAULT_FILTER: Filter = {
  type: 'all',
  ratingMin: 0,
  ratingMax: 0,
  tags: [],
  search: ''
}

function applyFilter(items: MediaItem[], filter: Filter): MediaItem[] {
  return items.filter(item => {
    if (filter.type !== 'all' && item.type !== filter.type) return false
    if (filter.ratingMin > 0 && item.rating < filter.ratingMin) return false
    if (filter.ratingMax > 0 && item.rating > filter.ratingMax) return false
    if (filter.tags.length > 0) {
      const hasAll = filter.tags.every(t => item.tags.includes(t))
      if (!hasAll) return false
    }
    if (filter.search.trim()) {
      const q = filter.search.trim().toLowerCase()
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.creator.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [filter, setFilterState] = useState<Filter>(DEFAULT_FILTER)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [loading, setLoading] = useState(true)

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [it, st, tg] = await Promise.all([fetchItems(), fetchStats(), fetchTags()])
      setItems(it)
      setStats(st)
      setAllTags(tg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const setFilter = useCallback((patch: Partial<Filter>) => {
    setFilterState(prev => ({ ...prev, ...patch }))
  }, [])

  const createItem = useCallback(async (input: CreateItemInput) => {
    await addItem(input)
    await refreshAll()
  }, [refreshAll])

  const updateItemById = useCallback(async (id: string, input: UpdateItemInput) => {
    await updateItem(id, input)
    await refreshAll()
  }, [refreshAll])

  const deleteItemById = useCallback(async (id: string) => {
    await deleteItem(id)
    await refreshAll()
  }, [refreshAll])

  const filteredItems = useMemo(() => applyFilter(items, filter), [items, filter])

  const value: StoreValue = {
    items,
    stats,
    allTags,
    filter,
    viewMode,
    loading,
    filteredItems,
    setFilter,
    setViewMode,
    createItem,
    updateItemById,
    deleteItemById,
    refreshAll
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
