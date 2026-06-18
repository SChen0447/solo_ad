import { create } from 'zustand'
import dayjs from 'dayjs'

export type MoodType = 'happy' | 'calm' | 'moved' | 'anxious' | 'tired' | 'surprise'

export type ViewType = 'week' | 'month'

export interface Entry {
  id: string
  title: string
  content: string
  date: string
  mood: MoodType
  tags: string[]
  image: string | null
  thumbnail: string | null
}

interface StoreState {
  entries: Entry[]
  currentView: ViewType
  selectedDate: string | null
  selectedEntryId: string | null
  searchQuery: string
  createFormOpen: boolean
  expandedGroups: Record<string, boolean>

  setCurrentView: (view: ViewType) => void
  setSelectedDate: (date: string | null) => void
  selectEntry: (id: string | null) => void
  setSearchQuery: (q: string) => void
  toggleCreateForm: () => void
  addEntry: (entry: Entry) => void
  updateEntry: (id: string, updates: Partial<Entry>) => void
  deleteEntry: (id: string) => void
  toggleGroup: (key: string) => void
  setMood: (id: string, mood: MoodType) => void
  addTag: (id: string, tag: string) => void
  removeTag: (id: string, tag: string) => void
  setEntryImage: (id: string, image: string | null, thumbnail: string | null) => void
}

const seedEntries = (): Entry[] => {
  const today = dayjs()
  const yesterday = today.subtract(1, 'day')
  const twoDaysAgo = today.subtract(2, 'day')
  const lastWeek = today.subtract(5, 'day')

  return [
    {
      id: 'seed-1',
      title: '阳光明媚的周末午后',
      content: '今天天气特别好，去了附近的公园散步。\n\n**看到了可爱的小猫**在草地上打滚，心情特别好！\n\n- 喝了一杯冰美式\n- 读了半本新书\n- 拍了很多好看的照片\n\n*生活真的很美好～*',
      date: today.toISOString(),
      mood: 'happy',
      tags: ['周末', '公园'],
      image: null,
      thumbnail: null,
    },
    {
      id: 'seed-2',
      title: '加班后的夜晚',
      content: '连续加班三天，今天终于告一段落。\n\n虽然很**疲惫**，但是看到项目上线的那一刻，一切都值得了。\n\n*给自己点一份夜宵作为奖励吧*',
      date: yesterday.hour(22).toISOString(),
      mood: 'tired',
      tags: ['工作', '加班'],
      image: null,
      thumbnail: null,
    },
    {
      id: 'seed-3',
      title: '朋友的来信',
      content: '收到了好久没联系的老朋友的消息，突然很**感动**。\n\n- 回忆了大学的时光\n- 约好了下个月见面\n- 交换了最近的照片\n\n**友谊万岁！**',
      date: twoDaysAgo.hour(19).toISOString(),
      mood: 'moved',
      tags: ['朋友', '感动'],
      image: null,
      thumbnail: null,
    },
    {
      id: 'seed-4',
      title: '项目deadline临近',
      content: '项目下周就要交付了，今天测试出了好几个bug，心里有点焦虑。\n\n不过一步步来，总能解决的。\n\n*深呼吸，继续加油*',
      date: lastWeek.hour(21).toISOString(),
      mood: 'anxious',
      tags: ['工作'],
      image: null,
      thumbnail: null,
    },
  ]
}

export const useStore = create<StoreState>((set, get) => ({
  entries: seedEntries(),
  currentView: 'week',
  selectedDate: null,
  selectedEntryId: null,
  searchQuery: '',
  createFormOpen: false,
  expandedGroups: {},

  setCurrentView: (view) => set({ currentView: view }),

  setSelectedDate: (date) => set({ selectedDate: date, selectedEntryId: null }),

  selectEntry: (id) => set({ selectedEntryId: id }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  toggleCreateForm: () => set({ createFormOpen: !get().createFormOpen }),

  addEntry: (entry) => set(state => ({
    entries: [entry, ...state.entries],
    createFormOpen: false,
    selectedEntryId: entry.id,
  })),

  updateEntry: (id, updates) => set(state => ({
    entries: state.entries.map(e => e.id === id ? { ...e, ...updates } : e),
  })),

  deleteEntry: (id) => set(state => ({
    entries: state.entries.filter(e => e.id !== id),
    selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
  })),

  toggleGroup: (key) => set(state => ({
    expandedGroups: { ...state.expandedGroups, [key]: !state.expandedGroups[key] },
  })),

  setMood: (id, mood) => get().updateEntry(id, { mood }),

  addTag: (id, tag) => {
    const entry = get().entries.find(e => e.id === id)
    if (!entry || entry.tags.includes(tag) || entry.tags.length >= 3) return
    get().updateEntry(id, { tags: [...entry.tags, tag] })
  },

  removeTag: (id, tag) => {
    const entry = get().entries.find(e => e.id === id)
    if (!entry) return
    get().updateEntry(id, { tags: entry.tags.filter(t => t !== tag) })
  },

  setEntryImage: (id, image, thumbnail) => {
    get().updateEntry(id, { image, thumbnail })
  },
}))
