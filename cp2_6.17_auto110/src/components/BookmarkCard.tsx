import { useState, useRef } from 'react'
import {
  ExternalLink,
  Trash2,
  Edit3,
  Share2,
  Check,
  Copy,
  MoreVertical,
} from 'lucide-react'
import type { Bookmark } from '@/api'
import { getTagColor, truncateUrl, cn } from '@/utils'
import useBookmarkStore from '@/store/useBookmarkStore'
import * as api from '@/api'

interface BookmarkCardProps {
  bookmark: Bookmark
  isSelected: boolean
  onEdit: (bookmark: Bookmark) => void
  compact?: boolean
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, folderId: string | null) => void
  folderId?: string | null
}

export default function BookmarkCard({
  bookmark,
  isSelected,
  onEdit,
  compact,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  folderId = null,
}: BookmarkCardProps) {
  const {
    toggleSelect,
    batchMode,
    setBatchMode,
    showToast,
    deleteBookmark,
  } = useBookmarkStore()

  const [showMenu, setShowMenu] = useState(false)
  const [sharing, setSharing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const handlePointerDown = () => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setBatchMode(true)
      toggleSelect(bookmark.id)
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current && clearTimeout(longPressTimer.current))
  }

  const handlePointerLeave = () => {
    if (longPressTimer.current && clearTimeout(longPressTimer.current))
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setBatchMode(true)
    if (!isSelected) {
      toggleSelect(bookmark.id)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (batchMode || isLongPress.current) {
      e.preventDefault()
      toggleSelect(bookmark.id)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteBookmark(bookmark.id)
      deleteBookmark(bookmark.id)
      showToast('删除成功', 'success')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
    setShowMenu(false)
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const { shareCode } = await api.shareBookmark(bookmark.id)
      const shareUrl = `${window.location.origin}/s/${shareCode}`
      await navigator.clipboard.writeText(shareUrl)
      showToast('链接已复制到剪贴板', 'success')
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setSharing(false)
    }
    setShowMenu(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookmark.url)
      showToast('链接已复制到剪贴板', 'success')
    } catch (err) {
      showToast('复制失败', 'error')
    }
    setShowMenu(false)
  }

  const handleOpenLink = () => {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }

  const tagColor = getTagColor(bookmark.tags[0] || 'default')

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 h-10 cursor-pointer group transition-colors',
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        )}
        draggable
        onDragStart={e => onDragStart && onDragStart(e, bookmark.id)}
        onDragOver={onDragOver}
        onDrop={e => {
          e.preventDefault()
          onDrop && onDrop(e, folderId)
        }}
      >
        {batchMode && (
          <div
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 group-hover:border-gray-400'
            )}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        )}

        <img
          src={bookmark.favicon || 'https://www.google.com/s2/favicons?domain=' + new URL(bookmark.url).hostname + '&sz=32'}
          alt=""
          className="w-4 h-4 rounded flex-shrink-0"
          onError={e => {
            ;(e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
          }}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate font-medium">{bookmark.title}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation()
              onEdit(bookmark)
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              handleDelete()
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border transition-all duration-300 ease-out',
        'hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
        'hover:-translate-y-[3px]',
        isSelected
          ? 'border-blue-500'
          : 'border-gray-200',
        isDragging && 'opacity-50',
        'cursor-pointer'
      )}
      style={{ width: '260px' }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={e => onDragStart && onDragStart(e, bookmark.id)}
    >
      {isSelected && (
        <div className="absolute top-2 left-2 z-10 bg-blue-500 rounded-full p-1 animate-[fadeIn_0.2s_ease-out']}>
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={
              bookmark.favicon ||
              'https://www.google.com/s2/favicons?domain=' + new URL(bookmark.url).hostname + '&sz=32'
            }
            alt=""
            className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
            onError={e => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="%23e5e7eb" viewBox="0 0 24 24"><rect width="24" height="24" rx="4"/><text x="12" y="16" text-anchor="middle" font-size="14" fill="%239ca3af">🔗</text></svg>'
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
              {bookmark.title}
            </h3>
          </div>

          <div className="relative">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleOpenLink()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  打开链接
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleCopyLink()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  复制链接
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onEdit(bookmark)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleShare()
                  }}
                  disabled={sharing}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  {sharing ? '生成中...' : '分享'}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-[12px] text-gray-500 truncate">
          {truncateUrl(bookmark.url)}
        </p>

        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.map(tag => {
              const colors = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className={cn(
                    'px-1.5 py-0.5 text-[11px] rounded-md font-medium',
                    colors.bg,
                    colors.text
                  )}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        )}

        {bookmark.note && (
          <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed">
            {bookmark.note}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
        <button
          onClick={e => {
            e.stopPropagation()
            handleShare()
          }}
          disabled={sharing}
          className="text-[11px] text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Share2 className="w-3.5 h-3.5" />
          分享
        </button>
        <span className="text-[10px] text-gray-400">
          {new Date(bookmark.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
    </div>
  )
}
