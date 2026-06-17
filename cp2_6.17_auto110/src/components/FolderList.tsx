import { useState } from 'react'
import {
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Folder,
  Trash2,
  Plus,
  X,
} from 'lucide-react'
import type { Bookmark } from '@/api'
import * as api from '@/api'
import BookmarkCard from './BookmarkCard'
import useBookmarkStore from '@/store/useBookmarkStore'
import { cn } from '@/utils'

interface FolderListProps {
  onEdit: (bookmark: Bookmark) => void
}

export default function FolderList({ onEdit }: FolderListProps) {
  const { folders, setFolders, addFolder, updateFolder, deleteFolder, showToast, setBookmarks, batchMode, clearSelection } = useBookmarkStore()
  const [newFolderName, setNewFolderName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const folder = await api.createFolder(newFolderName.trim())
      addFolder({ ...folder, bookmarks: [] })
      setNewFolderName('')
      setShowCreateInput(false)
      showToast('收藏夹创建成功', 'success')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  const handleToggleFolder = async (folderId: string, collapsed: boolean) => {
    try {
      const updated = await api.updateFolder(folderId, { collapsed: !collapsed })
      const folder = folders.find(f => f.id === folderId)
      updateFolder({ ...updated, bookmarks: folder?.bookmarks || [] })
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个收藏夹吗？其中的书签将被移出收藏夹。')) return
    try {
      await api.deleteFolder(folderId)
      deleteFolder(folderId)
      const updatedBookmarks = await api.getBookmarks()
      setBookmarks(updatedBookmarks)
      showToast('收藏夹已删除', 'success')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedId) return
    try {
      await api.updateBookmark(draggedId, { folderId })
      const [updatedBookmarks, updatedFolders] = await Promise.all([
        api.getBookmarks(),
        api.getFolders(),
      ])
      setBookmarks(updatedBookmarks)
      setFolders(updatedFolders)
      showToast('移动成功', 'success')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
    setDraggedId(null)
    setDragOverFolder(null)
    clearSelection()
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            收藏夹
          </h2>
          {!showCreateInput ? (
            <button
              onClick={() => setShowCreateInput(true)}
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              新建收藏夹
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                placeholder="输入收藏夹名称..."
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowCreateInput(false)
                  setNewFolderName('')
                }}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {folders.length === 0 && !showCreateInput ? (
          <p className="text-sm text-gray-400 text-center py-4">
            暂无收藏夹，点击上方按钮创建
          </p>
        ) : (
          <div className="space-y-2">
            {folders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  'rounded-lg border transition-all duration-300',
                  dragOverFolder === folder.id
                    ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onDragOver={e => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, folder.id)}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer group"
                  onClick={() => handleToggleFolder(folder.id, folder.collapsed)}
                >
                  <div className="flex items-center gap-3">
                    {folder.collapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <Folder className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-800">
                      {folder.name}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {folder.bookmarks?.length || 0}
                    </span>
                  </div>
                  <button
                    onClick={e => handleDeleteFolder(folder.id, e)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                {!folder.collapsed && (
                  <div className="border-t border-gray-100">
                    {!folder.bookmarks || folder.bookmarks.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        拖放书签到这里
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {folder.bookmarks.map((bookmark, index) => (
                          <div
                            key={bookmark.id}
                            className={cn(
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            )}
                          >
                            <BookmarkCard
                              bookmark={bookmark}
                              isSelected={useBookmarkStore.getState().selectedIds.has(bookmark.id)}
                              onEdit={onEdit}
                              compact
                              folderId={folder.id}
                              onDragStart={handleDragStart}
                              onDragOver={e => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onDrop={handleDrop}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
