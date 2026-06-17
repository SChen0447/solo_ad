import { useState, useEffect } from 'react'
import { Plus, Menu, X, Bookmark as BookmarkIcon } from 'lucide-react'
import * as api from '@/api'
import BookmarkForm from '@/components/BookmarkForm'
import BookmarkList from '@/components/BookmarkList'
import FolderList from '@/components/FolderList'
import ToastContainer from '@/components/ToastContainer'
import useBookmarkStore from '@/store/useBookmarkStore'
import type { Bookmark } from '@/api'

export default function App() {
  const [showForm, setShowForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { setBookmarks, setFolders, setAllTags, setLoading, setError, setBatchMode, clearSelection } = useBookmarkStore()

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [bookmarks, folders, tags] = await Promise.all([
          api.getBookmarks(),
          api.getFolders(),
          api.getAllTags(),
        ])
        setBookmarks(bookmarks)
        setFolders(folders)
        setAllTags(tags)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  const handleEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingBookmark(null)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="flex-shrink-0 h-14 bg-gray-800 text-white flex items-center justify-between px-4 md:px-6 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-bold tracking-wide">Bookmark Manager</h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => {
              clearSelection()
              setBatchMode(false)
              setEditingBookmark(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-5 h-5" />
            添加书签
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden flex-shrink-0 bg-gray-700 text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm">点击按钮添加新书签</span>
          <button
            onClick={() => {
              setEditingBookmark(null)
              setShowForm(true)
              setMobileMenuOpen(false)
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
      )}

      <FolderList onEdit={handleEdit} />
      <BookmarkList onEdit={handleEdit} />

      {showForm && (
        <BookmarkForm editingBookmark={editingBookmark} onClose={handleCloseForm} />
      )}

      <ToastContainer />

      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            clearSelection()
            setEditingBookmark(null)
            setShowForm(true)
          }}
          className="w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  )
}
