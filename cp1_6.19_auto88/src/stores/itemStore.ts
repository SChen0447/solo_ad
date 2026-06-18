import { create } from 'zustand'
import axios from 'axios'

export type ItemCategory = 'electronics' | 'books' | 'home' | 'clothing' | 'other'

export interface Item {
  id: string
  userId: string
  userName: string
  userAvatar: string
  userCreditScore: number
  title: string
  description: string
  category: ItemCategory
  condition: number
  expectedCategory: string
  expectedValueMin: number
  expectedValueMax: number
  imageUrl: string
  createdAt: number
}

interface ItemState {
  items: Item[]
  loading: boolean
  hasMore: boolean
  currentPage: number
  selectedItem: Item | null
  searchQuery: string
  selectedCategory: ItemCategory | 'all'
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: ItemCategory | 'all') => void
  setSelectedItem: (item: Item | null) => void
  fetchItems: (page?: number, reset?: boolean) => Promise<void>
  addItem: (item: Omit<Item, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  getRecommendations: (userId: string) => Promise<Item[]>
}

const categoryMap: Record<string, string> = {
  electronics: '电子产品',
  books: '书籍',
  home: '家居',
  clothing: '服饰',
  other: '其他',
}

export const categoryLabel = (cat: string) => categoryMap[cat] || cat

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  loading: false,
  hasMore: true,
  currentPage: 1,
  selectedItem: null,
  searchQuery: '',
  selectedCategory: 'all',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  fetchItems: async (page = 1, reset = false) => {
    if (get().loading) return
    set({ loading: true })

    const { searchQuery, selectedCategory } = get()
    const params: Record<string, unknown> = {
      page,
      limit: 12,
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    }

    try {
      const { data } = await axios.get('/api/items', { params })
      set((state) => ({
        items: reset ? data.items : [...state.items, ...data.items],
        hasMore: data.hasMore,
        currentPage: page,
        loading: false,
      }))
    } catch (error) {
      set({ loading: false })
      console.error('Failed to fetch items:', error)
    }
  },
  addItem: async (item) => {
    try {
      const { data } = await axios.post('/api/items', item)
      set((state) => ({
        items: [data, ...state.items],
      }))
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  },
  getRecommendations: async (userId) => {
    try {
      const { data } = await axios.get(`/api/exchange/recommendations/${userId}`)
      return data.items || []
    } catch (error) {
      console.error('Failed to get recommendations:', error)
      return []
    }
  },
}))
