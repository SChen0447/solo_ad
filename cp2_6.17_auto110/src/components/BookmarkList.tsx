import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  X,
  Filter,
  Tag,
  Trash2,
  FolderOpen,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { Bookmark } from '@/api'
import * as api from '@/api'
import BookmarkCard from './BookmarkCard'
import useBookmarkStore from '@/store/useBookmarkStore'
import { useDebounce, cn } from '@/utils'

interface BookmarkListProps {
  onEdit: (bookmark: Bookmark) => void
}

export default function BookmarkList({ onEdit }: BookmarkListProps) {
  const {
    bookmarks,
    allTags,
    selectedIds,
    batchMode,
    setBatchMode,
    clearSelection,
    selectAll,
    setLoading,
    setError,
    error,
    loading,
    setBookmarks,
    setAllTags,
    folders,
  } = useBookmarkStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showBatchMenu, setShowBatchMenu] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [newBatchTags, setNewBatchTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const listRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredBookmarks = useMemo(() => {
    let result = [...bookmarks].filter(b => !b.folderId)

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.note.toLowerCase().includes(q)
      )
    }

    if (selectedTagFilters.length > 0) {
      result = result.filter(b =>
        selectedTagFilters.some(tag => b.tags.includes(tag))
      )
    }

    return result
  }, [bookmarks, debouncedSearch, selectedTagFilters])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [bookmarksData, tagsData] = await Promise.all([
          api.searchBookmarks(debouncedSearch, selectedTagFilters),
          api.getAllTags(),
        ])
        setBookmarks(bookmarksData)
        setAllTags(tagsData)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [debouncedSearch, selectedTagFilters])

  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current) return
      const { scrollTop, clientHeight } = listRef.current
      const cardHeight = 220
      const cardsPerRow = 4
      const start = Math.max(0, Math.floor(scrollTop / cardHeight) * cardsPerRow - 4)
      const end = Math.min(
        filteredBookmarks.length,
        start + Math.ceil(clientHeight / cardHeight) * cardsPerRow + 8
      )
      setVisibleRange({ start, end })
    }

    const container = listRef.current
    container?.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => container?.removeEventListener('scroll', handleScroll)
  }, [filteredBookmarks.length])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    if (!draggedId) return
    try {
      await api.updateBookmark(draggedId, { folderId })
      const updated = await api.getBookmarks()
      setBookmarks(updated)
      useBookmarkStore.getState().showToast('移动成功', 'success')
    } catch (err) {
      useBookmarkStore.getState().showToast((err as Error).message, 'error')
    }
    setDraggedId(null)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      await api.batchDelete(Array.from(selectedIds))
      const updated = await api.getBookmarks()
      setBookmarks(updated)
      clearSelection()
      useBookmarkStore.getState().showToast(`已删除 ${selectedIds.size} 个书签`, 'success')
    } catch (err) {
      useBookmarkStore.getState().showToast((err as Error).message, 'error')
    }
    setShowBatchMenu(false)
  }

  const handleBatchTag = async () => {
    if (selectedIds.size === 0 || newBatchTags.length === 0) return
    try {
      await api.batchTag(Array.from(selectedIds), newBatchTags)
      const updated = await api.getBookmarks()
      setBookmarks(updated)
      clearSelection()
      useBookmarkStore.getState().showToast(`已为 ${selectedIds.size} 个书签添加标签`, 'success')
    } catch (err) {
      useBookmarkStore.getState().showToast((err as Error).message, 'error')
    }
    setShowTagModal(false)
    setNewBatchTags([])
  }

  const handleBatchMove = async (folderId: string) => {
    if (selectedIds.size === 0) return
    try {
      await api.batchMove(Array.from(selectedIds), folderId)
      const updated = await api.getBookmarks()
      setBookmarks(updated)
      clearSelection()
      useBookmarkStore.getState().showToast(`已移动 ${selectedIds.size} 个书签`, 'success')
    } catch (err) {
      useBookmarkStore.getState().showToast((err as Error).message, 'error')
    }
    setShowMoveMenu(false)
    setShowBatchMenu(false)
  }

  const handleAddBatchTag = () => {
    const trimmed = newTagName.trim()
    if (!trimmed || newBatchTags.includes(trimmed)) return
    if (newBatchTags.length >= 5) return
    setNewBatchTags([...newBatchTags, trimmed])
    setNewTagName('')
  }

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTagFilters([])
  }

  const renderSkeleton = useCallback(() => {
    return Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
        style={{ width: '260px' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded mb-2" />
        <div className="flex gap-1.5 mb-2">
          <div className="h-5 w-12 bg-gray-200 rounded" />
          <div className="h-5 w-10 bg-gray-200 rounded" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3 mt-1" />
      </div>
    ))
  }, [])

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">暂无书签</h3>
      <p className="text-gray-500 mb-4">
        {searchQuery || selectedTagFilters.length > 0
          ? '没有找到匹配的书签，试试其他关键词'
          : '点击右上角的添加按钮开始收藏吧'}
      </p>
      {(searchQuery || selectedTagFilters.length > 0) && (
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-blue-500 hover:text-blue-600 font-medium"
        >
          清除筛选条件
        </button>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索标题、URL或笔记..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all',
                selectedTagFilters.length > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>筛选标签</span>
              {selectedTagFilters.length > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTagFilters.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>

            {showTagDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-30">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  选择标签
                </div>
                {allTags.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">暂无标签</div>
                ) : (
                  allTags.map(tag => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center',
                          selectedTagFilters.includes(tag)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        )}
                      >
                        {selectedTagFilters.includes(tag) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{tag}</span>
                    </label>
                  ))
                )}
                {selectedTagFilters.length > 0 && (
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => setSelectedTagFilters([])}
                      className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                    >
                      清除所有
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {batchMode && (
            <div className="flex items-center gap-2 ml-auto bg-blue-50 px-3 py-1.5 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">
                已选择 {selectedIds.size} 项
              </span>
              <button
                onClick={() => {
                  const allUngrouped = bookmarks.filter(b => !b.folderId)
                  if (selectedIds.size === allUngrouped.length) {
                    clearSelection()
                  } else {
                    selectAll()
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === bookmarks.filter(b => !b.folderId).length
                  ? '取消全选'
                  : '全选'}
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium">
            已选择 {selectedIds.size} 个书签
          </span>
          <div className="h-6 w-px bg-gray-600" />
          <div className="relative">
            <button
              onClick={() => setShowBatchMenu(!showBatchMenu)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              批量操作
              <ChevronDown className="w-4 h-4" />
            </button>
            {showBatchMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                <button
                  onClick={handleBatchDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </button>
                <button
                  onClick={() => {
                    setShowTagModal(true)
                    setShowBatchMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" />
                  批量添加标签
                </button>
                <button
                  onClick={() => {
                    setShowMoveMenu(true)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  批量移动至收藏夹
                </button>
              </div>
            )}
          </div>
          {showMoveMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                选择收藏夹
              </div>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleBatchMove(folder.id)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {folder.name}
                </button>
              ))}
              <button
                onClick={() => handleBatchMove('')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
              >
                移出收藏夹
              </button>
            </div>
          )}
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批量添加标签</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {newBatchTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setNewBatchTags(prev => prev.filter(t => t !== tag))
                    }
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddBatchTag())
                }
                placeholder="输入标签名称..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={newBatchTags.length >= 5}
              />
              <button
                onClick={handleAddBatchTag}
                disabled={newBatchTags.length >= 5 || !newTagName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                添加
              </button>
            </div>
            {allTags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">已有标签：</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags
                    .filter(t => !newBatchTags.includes(t))
                    .slice(0, 10)
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() =>
                          setNewBatchTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag].slice(0, 5)
                          )
                        }
                        disabled={newBatchTags.length >= 5}
                        className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTagModal(false)
                  setNewBatchTags([])
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchTag}
                disabled={newBatchTags.length === 0}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50"
        onClick={() => {
          setShowTagDropdown(false)
          setShowBatchMenu(false)
          setShowMoveMenu(false)
        }}
      >
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {renderSkeleton()}
            </div>
          ) : filteredBookmarks.length === 0 ? (
            renderEmptyState()
          ) : (
            <div
              className="grid gap-4 justify-center"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, 260px)',
              }}
              onDragOver={handleDragOver}
            >
              {filteredBookmarks
                .slice(visibleRange.start, visibleRange.end)
                .map(bookmark => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    isSelected={selectedIds.has(bookmark.id)}
                    onEdit={onEdit}
                    isDragging={draggedId === bookmark.id}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {showTagDropdown || showBatchMenu || showMoveMenu
        ? null
        : undefined}
    </div>
  )
}
