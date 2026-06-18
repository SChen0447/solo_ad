import { create } from 'zustand'

export const THEME_COLORS = [
  '#FFE4E1',
  '#E8F5E9',
  '#E3F2FD',
  '#FFF3E0',
  '#F3E5F5',
  '#FFF8E1',
  '#E0F2F1',
  '#FCE4EC',
]

export interface Card {
  id: string
  content: string
  image?: string
  themeColor: string
  tags: string[]
  isTop: boolean
  createdAt: number
}

interface StoreState {
  cards: Card[]
  searchKeyword: string
  filterTags: string[]
  editingCard: Card | null
  isEditorOpen: boolean
  addCard: (card: Omit<Card, 'id' | 'createdAt' | 'isTop'>) => void
  deleteCard: (id: string) => void
  editCard: (id: string, updates: Partial<Card>) => void
  setTop: (id: string) => void
  setSearch: (keyword: string) => void
  toggleFilterTag: (tag: string) => void
  clearFilters: () => void
  openEditor: (card?: Card) => void
  closeEditor: () => void
  reorderCards: (fromIndex: number, toIndex: number) => void
  getFilteredCards: () => Card[]
  getAllTags: () => { tag: string; color: string; count: number }[]
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const initialCards: Card[] = [
  {
    id: generateId(),
    content: '清晨的阳光透过窗帘，有一种温暖的感觉。可以画一幅关于晨光的插画，主角是一只猫咪在窗台上打盹。',
    themeColor: THEME_COLORS[5],
    tags: ['插画', '猫咪', '晨光'],
    isTop: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: generateId(),
    content: '文案灵感：不是所有的相遇都有结果，但每一次相遇都有意义。—— 写在春天的末尾',
    themeColor: THEME_COLORS[1],
    tags: ['文案', '治愈'],
    isTop: true,
    createdAt: Date.now() - 172800000,
  },
  {
    id: generateId(),
    content: '产品设计想法：一个帮助人们养成阅读习惯的APP，每天推送一页书，配上轻音乐。',
    themeColor: THEME_COLORS[2],
    tags: ['产品', '设计', '阅读'],
    isTop: false,
    createdAt: Date.now() - 259200000,
  },
  {
    id: generateId(),
    content: '旅行手账素材：京都的秋天，红叶、古寺、抹茶冰淇淋。色调可以用暖橙色+深棕色。',
    themeColor: THEME_COLORS[3],
    tags: ['旅行', '手账', '京都'],
    isTop: false,
    createdAt: Date.now() - 345600000,
  },
  {
    id: generateId(),
    content: '诗歌片段：\n月光洒在海面上\n像打碎了的银盘\n我捡起一片\n装进口袋带回家',
    themeColor: THEME_COLORS[6],
    tags: ['诗歌', '月光'],
    isTop: false,
    createdAt: Date.now() - 432000000,
  },
  {
    id: generateId(),
    content: 'UI设计灵感：毛玻璃效果 + 柔和渐变 + 大留白。适合做冥想类应用的界面。',
    themeColor: THEME_COLORS[4],
    tags: ['设计', 'UI', '冥想'],
    isTop: false,
    createdAt: Date.now() - 518400000,
  },
  {
    id: generateId(),
    content: '烘焙食谱灵感：樱花抹茶曲奇，需要准备樱花酱、抹茶粉、黄油。形状可以做成小花。',
    themeColor: THEME_COLORS[0],
    tags: ['美食', '烘焙', '抹茶'],
    isTop: false,
    createdAt: Date.now() - 604800000,
  },
  {
    id: generateId(),
    content: '穿搭灵感：莫兰迪色系搭配——雾霾蓝毛衣 + 卡其色阔腿裤 + 白色帆布鞋。简约又温柔。',
    themeColor: THEME_COLORS[7],
    tags: ['穿搭', '莫兰迪'],
    isTop: false,
    createdAt: Date.now() - 691200000,
  },
]

export const useStore = create<StoreState>((set, get) => ({
  cards: initialCards,
  searchKeyword: '',
  filterTags: [],
  editingCard: null,
  isEditorOpen: false,

  addCard: (cardData) => {
    const newCard: Card = {
      ...cardData,
      id: generateId(),
      isTop: false,
      createdAt: Date.now(),
    }
    set((state) => ({
      cards: [newCard, ...state.cards],
    }))
  },

  deleteCard: (id) => {
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
    }))
  },

  editCard: (id, updates) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  },

  setTop: (id) => {
    set((state) => {
      const card = state.cards.find((c) => c.id === id)
      if (!card) return state
      const newIsTop = !card.isTop
      const otherCards = state.cards.filter((c) => c.id !== id)
      const updatedCard = { ...card, isTop: newIsTop }
      
      if (newIsTop) {
        return { cards: [updatedCard, ...otherCards] }
      } else {
        const topCards = otherCards.filter((c) => c.isTop)
        const normalCards = otherCards.filter((c) => !c.isTop)
        return { cards: [...topCards, updatedCard, ...normalCards] }
      }
    })
  },

  setSearch: (keyword) => {
    set({ searchKeyword: keyword })
  },

  toggleFilterTag: (tag) => {
    set((state) => {
      const hasTag = state.filterTags.includes(tag)
      return {
        filterTags: hasTag
          ? state.filterTags.filter((t) => t !== tag)
          : [...state.filterTags, tag],
      }
    })
  },

  clearFilters: () => {
    set({ searchKeyword: '', filterTags: [] })
  },

  openEditor: (card) => {
    set({
      isEditorOpen: true,
      editingCard: card || null,
    })
  },

  closeEditor: () => {
    set({
      isEditorOpen: false,
      editingCard: null,
    })
  },

  reorderCards: (fromIndex, toIndex) => {
    set((state) => {
      const cards = [...state.cards]
      const [removed] = cards.splice(fromIndex, 1)
      cards.splice(toIndex, 0, removed)
      return { cards }
    })
  },

  getFilteredCards: () => {
    const { cards, searchKeyword, filterTags } = get()
    const keyword = searchKeyword.toLowerCase().trim()

    return cards.filter((card) => {
      if (filterTags.length > 0) {
        const hasMatchingTag = filterTags.some((tag) => card.tags.includes(tag))
        if (!hasMatchingTag) return false
      }

      if (keyword) {
        const contentMatch = card.content.toLowerCase().includes(keyword)
        const tagMatch = card.tags.some((t) => t.toLowerCase().includes(keyword))
        if (!contentMatch && !tagMatch) return false
      }

      return true
    })
  },

  getAllTags: () => {
    const { cards } = get()
    const tagMap = new Map<string, { color: string; count: number }>()

    cards.forEach((card) => {
      card.tags.forEach((tag) => {
        const existing = tagMap.get(tag)
        if (existing) {
          existing.count++
        } else {
          tagMap.set(tag, { color: card.themeColor, count: 1 })
        }
      })
    })

    return Array.from(tagMap.entries()).map(([tag, data]) => ({
      tag,
      color: data.color,
      count: data.count,
    }))
  },
}))
