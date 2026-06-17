import { create } from 'zustand'
import type { Bookmark, Folder } from '@/api'
import { TOAST_DURATION } from '@/utils'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface BookmarkState {
  bookmarks: Bookmark[]
  folders: (Folder & { bookmarks?: Bookmark[] })[]
  allTags: string[]
  selectedIds: Set<string>
  batchMode: boolean
  searchQuery: string
  selectedTags: string[]
  loading: boolean
  error: string | null
  toasts: Toast[]

  setBookmarks: (bookmarks: Bookmark[]) => void
  setFolders: (folders: (Folder & { bookmarks?: Bookmark[] })[]) => void
  setAllTags: (tags: string[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void

  toggleSelect: (id: string) => void
  clearSelection: () => void
  selectAll: () => void
  setBatchMode: (enabled: boolean) => void

  addBookmark: (bookmark: Bookmark) => void
  updateBookmark: (bookmark: Bookmark) => void
  deleteBookmark: (id: string) => void

  addFolder: (folder: Folder & { bookmarks?: Bookmark[] }) => void
  updateFolder: (folder: Folder & { bookmarks?: Bookmark[] }) => void
  deleteFolder: (id: string) => void

  showToast: (message: string, type?: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
}

const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  folders: [],
  allTags: [],
  selectedIds: new Set(),
  batchMode: false,
  searchQuery: '',
  selectedTags: [],
  loading: false,
  error: null,
  toasts: [],

  setBookmarks: bookmarks => set({ bookmarks }),
  setFolders: folders => set({ folders }),
  setAllTags: allTags => set({ allTags }),
  setLoading: loading => set({ loading }),
  setError: error => set({ error }),
  setSearchQuery: searchQuery => set({ searchQuery }),
  setSelectedTags: selectedTags => set({ selectedTags }),

  toggleSelect: id =>
    set(state => {
      const newSelected = new Set(state.selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return { selectedIds: newSelected }
    }),

  clearSelection: () => set({ selectedIds: new Set(), batchMode: false }),
  selectAll: () =>
    set(state => ({
      selectedIds: new Set(state.bookmarks.map(b => b.id)),
    })),
  setBatchMode: batchMode => set({ batchMode }),

  addBookmark: bookmark =>
    set(state => ({ bookmarks: [bookmark, ...state.bookmarks] })),

  updateBookmark: bookmark =>
    set(state => ({
      bookmarks: state.bookmarks.map(b => (b.id === bookmark.id ? bookmark : b)),
    })),

  deleteBookmark: id =>
    set(state => ({
      bookmarks: state.bookmarks.filter(b => b.id !== id),
    })),

  addFolder: folder =>
    set(state => ({ folders: [...state.folders, folder] })),

  updateFolder: folder =>
    set(state => ({
      folders: state.folders.map(f => (f.id === folder.id ? folder : f)),
    })),

  deleteFolder: id =>
    set(state => ({
      folders: state.folders.filter(f => f.id !== id),
    })),

  showToast: (message, type = 'success', duration = TOAST_DURATION) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }
    set(state => ({ toasts: [...state.toasts, toast] }))
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },

  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    })),
}))

export default useBookmarkStore
