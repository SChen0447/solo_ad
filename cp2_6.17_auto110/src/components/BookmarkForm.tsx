import { useState, useEffect } from 'react'
import { Plus, X, Tag, Link as LinkIcon, FileText, Loader2 } from 'lucide-react'
import * as api from '@/api'
import { validateUrl, cn } from '@/utils'
import useBookmarkStore from '@/store/useBookmarkStore'

interface BookmarkFormProps {
  editingBookmark?: api.Bookmark | null
  onClose: () => void
}

export default function BookmarkForm({ editingBookmark, onClose }: BookmarkFormProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [fetching, setFetching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ url?: string; tags?: string }>({})

  const { allTags, addBookmark, updateBookmark, showToast } = useBookmarkStore()
  const isEditing = !!editingBookmark

  useEffect(() => {
    if (editingBookmark) {
      setUrl(editingBookmark.url)
      setTitle(editingBookmark.title)
      setNote(editingBookmark.note)
      setTags(editingBookmark.tags)
    }
  }, [editingBookmark])

  useEffect(() => {
    if (!url || isEditing) return

    const timer = setTimeout(async () => {
      if (validateUrl(url)) {
        setFetching(true)
        setErrors({})
        try {
          const data = await api.fetchUrlInfo(url)
          setTitle(data.title)
        } catch (err) {
          setErrors({ url: (err as Error).message })
        } finally {
          setFetching(false)
        }
      } else if (url.length > 0) {
        setErrors({ url: '请输入有效的URL，必须包含 http:// 或 https://' })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [url, isEditing])

  const handleAddTag = () => {
    const trimmedTag = newTag.trim()
    if (!trimmedTag) return
    if (tags.includes(trimmedTag)) {
      setErrors({ tags: '该标签已存在' })
      return
    }
    if (tags.length >= 5) {
      setErrors({ tags: '最多只能添加5个标签' })
      return
    }
    setTags([...tags, trimmedTag])
    setNewTag('')
    setErrors({})
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSelectExistingTag = (tag: string) => {
    if (tags.includes(tag)) {
      handleRemoveTag(tag)
    } else {
      handleAddTag()
      setTags([...tags, tag])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { url?: string; tags?: string } = {}

    if (!url) {
      newErrors.url = 'URL不能为空'
    } else if (!validateUrl(url)) {
      newErrors.url = '请输入有效的URL，必须包含 http:// 或 https://'
    }

    if (tags.length > 5) {
      newErrors.tags = '最多只能添加5个标签'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      if (isEditing && editingBookmark) {
        const updated = await api.updateBookmark(editingBookmark.id, {
          url,
          title,
          note,
          tags,
        })
        updateBookmark(updated)
        showToast('书签更新成功', 'success')
      } else {
        const bookmark = await api.addBookmark({ url, title, note, tags })
        addBookmark(bookmark)
        showToast('书签添加成功', 'success')
      }
      onClose()
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? '编辑书签' : '添加书签'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={cn(
                  'w-full px-4 py-3 rounded-lg border transition-colors',
                  errors.url
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                )}
                disabled={isEditing}
              />
              {fetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>
            {errors.url && (
              <p className="mt-1 text-sm text-red-500">{errors.url}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="网站标题"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              笔记
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="添加一些笔记..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              标签 ({tags.length}/5)
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="输入新标签..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-sm"
                disabled={tags.length >= 5}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={tags.length >= 5 || !newTag.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {errors.tags && (
              <p className="mt-1 text-sm text-red-500">{errors.tags}</p>
            )}

            {allTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">已有标签：</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags
                    .filter(t => !tags.includes(t))
                    .slice(0, 10)
                    .map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectExistingTag(tag)}
                        disabled={tags.length >= 5}
                        className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || fetching}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isEditing ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
