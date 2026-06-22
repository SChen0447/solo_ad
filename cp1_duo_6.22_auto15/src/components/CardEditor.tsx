import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, renderMarkdownSimple } from '../api'

interface Props {
  card: Card | null
  onSave: (data: { title: string; content: string; tags: string[] }) => Promise<void>
  onDelete?: () => void
  onBack: () => void
}

export default function CardEditor({ card, onSave, onDelete, onBack }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoad = useRef(true)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setContent(card.content)
      setTagsInput(card.tags.join(', '))
    } else {
      setTitle('')
      setContent('')
      setTagsInput('')
    }
    setLastSaved(null)
    initialLoad.current = true
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [card])

  const parseTags = (input: string): string[] => {
    const seen = new Set<string>()
    return input
      .split(',')
      .map(t => t.trim())
      .filter(t => t && !seen.has(t) && (seen.add(t), true))
      .slice(0, 5)
  }

  const doSave = useCallback(async () => {
    const tags = parseTags(tagsInput)
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    if (title.length > 50) {
      setError('标题不能超过50字')
      return
    }
    if (tags.length > 5) {
      setError('标签不能超过5个')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave({ title: title.trim(), content, tags })
      setLastSaved(Date.now())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }, [title, content, tagsInput, onSave])

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false
      return
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      doSave()
    }, 600)
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [title, content, tagsInput, doSave])

  const tags = parseTags(tagsInput)
  const previewHtml = renderMarkdownSimple(content)

  const saveStatusText = (() => {
    if (saving) return '保存中...'
    if (error) return error
    if (lastSaved) return `已保存 ${new Date(lastSaved).toLocaleTimeString('zh-CN')}`
    return '尚未保存'
  })()

  return (
    <div className="card-editor">
      <div className="editor-toolbar">
        <div className="editor-info">
          <h2 className="editor-title">{card ? '编辑卡片' : '新建卡片'}</h2>
          <span className={`save-status ${error ? 'error' : saving ? 'saving' : 'saved'}`}>
            {saving ? '⏳' : error ? '⚠️' : lastSaved ? '✓' : '📝'} {saveStatusText}
          </span>
        </div>
        <div className="editor-actions">
          <button
            className="btn btn-primary"
            onClick={() => doSave()}
            disabled={saving}
          >
            {saving ? '保存中...' : '立即保存'}
          </button>
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              🗑️ 删除
            </button>
          )}
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-left">
          <div className="form-group">
            <label className="form-label">
              标题 <span className="char-count">{title.length}/50</span>
            </label>
            <input
              type="text"
              className="form-input title-input"
              placeholder="输入卡片标题（最多50字）"
              value={title}
              maxLength={50}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              标签 <span className="char-count">{tags.length}/5</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="输入标签，用逗号分隔（最多5个）"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
            <div className="tags-preview">
              {tags.map((t, i) => (
                <span key={i} className="tag-preview-chip">#{t}</span>
              ))}
              {tags.length === 0 && <span className="tags-placeholder">暂无标签</span>}
            </div>
          </div>

          <div className="form-group grow">
            <label className="form-label">正文（支持 Markdown）</label>
            <textarea
              className="form-textarea"
              placeholder={'输入正文内容，支持 Markdown 格式：\n# 标题\n**粗体** *斜体*\n`代码` [链接](url)'}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
        </div>

        <div className="editor-right">
          <div className="form-label">实时预览</div>
          <div className="card-preview">
            <div className="card-preview-header">
              <h3 className="card-preview-title">{title || '（无标题）'}</h3>
              <div className="card-preview-tags">
                {tags.map((t, i) => (
                  <span key={i} className="card-tag">#{t}</span>
                ))}
              </div>
            </div>
            <div
              className="card-preview-content markdown-body"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
