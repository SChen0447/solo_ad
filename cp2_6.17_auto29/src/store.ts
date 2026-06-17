import { create } from 'zustand'
import type { ArchiveFile, FileStats, SearchParams } from '@/api'
import {
  fetchFiles,
  fetchStats,
  searchFiles,
  uploadFile as apiUploadFile,
  updateFile as apiUpdateFile,
  fetchFile as apiFetchFile,
} from '@/api'

interface ArchiveStore {
  files: ArchiveFile[]
  stats: FileStats
  searchResults: ArchiveFile[]
  searchLoading: boolean
  currentFile: ArchiveFile | null
  sidebarOpen: boolean
  searchParams: SearchParams

  loadFiles: () => Promise<void>
  loadStats: () => Promise<void>
  uploadFile: (file: File) => Promise<void>
  updateFile: (
    id: string,
    data: { tags?: string[]; notes?: string; importance?: number }
  ) => Promise<void>
  loadFile: (id: string) => Promise<void>
  search: (params: SearchParams) => Promise<void>
  setSearchParams: (params: SearchParams) => void
  setSidebarOpen: (open: boolean) => void
  setCurrentFile: (file: ArchiveFile | null) => void
}

const defaultStats: FileStats = {
  total: 0,
  todayCount: 0,
  typeDistribution: {},
}

export const useArchiveStore = create<ArchiveStore>((set, get) => ({
  files: [],
  stats: defaultStats,
  searchResults: [],
  searchLoading: false,
  currentFile: null,
  sidebarOpen: false,
  searchParams: {},

  loadFiles: async () => {
    try {
      const files = await fetchFiles()
      set({ files })
    } catch (e) {
      console.error('Failed to load files:', e)
    }
  },

  loadStats: async () => {
    try {
      const stats = await fetchStats()
      set({ stats })
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  },

  uploadFile: async (file: File) => {
    try {
      await apiUploadFile(file)
      await Promise.all([get().loadFiles(), get().loadStats()])
    } catch (e) {
      console.error('Failed to upload file:', e)
      throw e
    }
  },

  updateFile: async (id, data) => {
    try {
      const updated = await apiUpdateFile(id, data)
      set((state) => ({
        files: state.files.map((f) => (f.id === id ? { ...f, ...updated } : f)),
        currentFile: state.currentFile?.id === id ? updated : state.currentFile,
      }))
      await get().loadStats()
    } catch (e) {
      console.error('Failed to update file:', e)
    }
  },

  loadFile: async (id: string) => {
    try {
      const file = await apiFetchFile(id)
      set({ currentFile: file })
    } catch (e) {
      console.error('Failed to load file:', e)
    }
  },

  search: async (params: SearchParams) => {
    set({ searchLoading: true, searchParams: params })
    try {
      const results = await searchFiles(params)
      set({ searchResults: results, searchLoading: false })
    } catch (e) {
      console.error('Search failed:', e)
      set({ searchLoading: false })
    }
  },

  setSearchParams: (params: SearchParams) => {
    set({ searchParams: params })
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },

  setCurrentFile: (file: ArchiveFile | null) => {
    set({ currentFile: file })
  },
}))
