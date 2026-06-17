import { useState, useCallback } from 'react'
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
  const {
    folders,
    setFolders,
    addFolder,
    updateFolder,
    deleteFolder,
    showToast,
    setBookmarks,
    batchMode,
    clearSelection,
  } = useBookmarkStore()
  const [newFolderName, setNewFolderName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false)

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

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    setIsGlobalDragOver(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20)
    } catch {
      // ignore
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverFolder(null)
    setIsGlobalDragOver(false)
  }, [])

  const handleFolderDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragOverFolder !== folderId) {
        setDragOverFolder(folderId)
      }
    },
    [dragOverFolder]
  )

  const handleFolderDragLeave = useCallback(
    (e: React.DragEvent, folderId: string) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY

      if (
        x <= rect.left ||
        x >= rect.right ||
        y <= rect.top ||
        y >= rect.bottom
      ) {
        if (dragOverFolder === folderId) {
          setDragOverFolder(null)
        }
      }
    },
    [dragOverFolder]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent, folderId: string) => {
      e.preventDefault()
      e.stopPropagation()

      const id = draggedId || e.dataTransfer.getData('text/plain')
      if (!id) return

      try {
        await api.updateBookmark(id, { folderId })
        const [updatedBookmarks, updatedFolders] = await Promise.all([
          api.getBookmarks(),
          api.getFolders(),
        ])
        setBookmarks(updatedBookmarks)
        setFolders(updatedFolders)
        showToast('移动成功', 'success')
      } catch (err) {
        showToast((err as Error).message, 'error')
      } finally {
        setDraggedId(null)
        setDragOverFolder(null)
        setIsGlobalDragOver(false)
      }
      clearSelection()
    },
    [draggedId, setBookmarks, setFolders, showToast, clearSelection]
  )

  const getFolderDropIndicator = (folderId: string) => {
    if (dragOverFolder === folderId && draggedId) {
      return 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50/80 scale-[1.02] border-blue-400'
    }
    if (isGlobalDragOver && draggedId) {
      return 'border-dashed border-gray-300'
    }
    return 'border-gray-200 hover:border-gray-300'
  }

  return (
    <div
      className={cn(
        'bg-white border-b border-gray-200 transition-colors',
        isGlobalDragOver && draggedId && 'bg-blue-50/30'
      )}
      onDragEnd={handleDragEnd}
    >
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
          <div
            className={cn(
              'text-center py-8 border-2 border-dashed rounded-lg transition-all duration-300',
              isGlobalDragOver && draggedId
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200'
            )}
          >
            <Folder
              className={cn(
                'w-10 h-10 mx-auto mb-2 transition-colors',
                isGlobalDragOver && draggedId ? 'text-blue-400' : 'text-gray-300'
              )}
            />
            <p
              className={cn(
                'text-sm transition-colors',
                isGlobalDragOver && draggedId ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              {isGlobalDragOver && draggedId
                ? '拖放到这里创建收藏夹'
                : '暂无收藏夹，点击上方按钮创建'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  'rounded-lg border transition-all duration-300 overflow-hidden',
                  getFolderDropIndicator(folder.id)
                )}
                onDragOver={e => handleFolderDragOver(e, folder.id)}
                onDragLeave={e => handleFolderDragLeave(e, folder.id)}
                onDrop={e => handleDrop(e, folder.id)}
              >
                <div
                  className={cn(
                    'flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors',
                    dragOverFolder === folder.id && draggedId
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() => handleToggleFolder(folder.id, folder.collapsed)}
                >
                  <div className="flex items-center gap-3">
                    {folder.collapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <Folder
                      className={cn(
                        'w-5 h-5 transition-colors',
                        dragOverFolder === folder.id && draggedId
                          ? 'text-blue-500'
                          : 'text-yellow-500'
                      )}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {folder.name}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full transition-colors',
                        dragOverFolder === folder.id && draggedId
                          ? 'bg-blue-200 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {folder.bookmarks?.length || 0}
                    </span>
                    {dragOverFolder === folder.id && draggedId && (
                      <span className="text-xs text-blue-500 font-medium animate-pulse">
                        松开以移动
                      </span>
                    )}
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
                      <div
                        className={cn(
                          'px-4 py-6 text-center text-sm border-2 border-dashed m-2 rounded-lg transition-all',
                          dragOverFolder === folder.id && draggedId
                            ? 'border-blue-300 bg-blue-50/50 text-blue-500'
                            : 'border-gray-200 text-gray-400'
                        )}
                      >
                        {dragOverFolder === folder.id && draggedId
                          ? '松手放置到此处'
                          : '拖放书签到这里'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {folder.bookmarks.map((bookmark, index) => (
                          <div
                            key={bookmark.id}
                            className={cn(
                              'transition-all',
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            )}
                          >
                            <BookmarkCard
                              bookmark={bookmark}
                              isSelected={
                                useBookmarkStore.getState().selectedIds.has(
                                  bookmark.id
                                )
                              }
                              onEdit={onEdit}
                              compact
                              folderId={folder.id}
                              onDragStart={handleDragStart}
                              onDragOver={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleFolderDragOver(e, folder.id)
                              }}
                              onDrop={(e, _fid) => handleDrop(e, folder.id)}
                              isDragging={draggedId === bookmark.id}
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

        {isGlobalDragOver && draggedId && (
          <div className="pointer-events-none fixed inset-0 border-2 border-blue-400/30 border-dashed m-2 rounded-2xl z-10" />
        )}
      </div>
    </div>
  )
}
