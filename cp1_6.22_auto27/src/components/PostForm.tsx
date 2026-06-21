import { useState, useEffect, useRef } from 'react'
import { TAGS, getTagColor } from '../api'

interface PostFormProps {
  onClose: () => void
  onSubmit: (content: string, tags: string[]) => void
  userName: string
}

function PostForm({ onClose, onSubmit, userName }: PostFormProps) {
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName))
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tagName])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (content.length > 140) return
    onSubmit(content.trim(), selectedTags)
  }

  const charCount = content.length
  const isOverLimit = charCount > 140

  return (
    <div className="post-form-modal" onClick={onClose}>
      <div className="post-form" onClick={(e) => e.stopPropagation()}>
        <div className="post-form-header">
          <h3 className="post-form-title">发布漂流瓶</h3>
          <button className="post-form-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">昵称</label>
            <input
              type="text"
              className="form-input"
              value={userName}
              disabled
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">内容</label>
            <textarea
              ref={textareaRef}
              className="form-textarea"
              placeholder="说点什么吧..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={140}
            />
            <div className={`char-count ${isOverLimit ? 'warning' : ''}`}>
              {charCount}/140
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              标签
              <span style={{ fontWeight: 'normal', color: '#a0aec0', marginLeft: '8px' }}>
                可选1-3个
              </span>
            </label>
            <div className="tags-selector">
              {TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.name)
                const isDisabled = !isSelected && selectedTags.length >= 3
                const colors = getTagColor(tag.name)
                return (
                  <span
                    key={tag.name}
                    className={`tag-option ${isDisabled ? 'disabled' : ''}`}
                    style={{
                      backgroundColor: isSelected ? colors.bg : '#f0f0f0',
                      color: isSelected ? colors.text : '#718096',
                    }}
                    onClick={() => !isDisabled && handleTagToggle(tag.name)}
                  >
                    #{tag.name}
                  </span>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="form-submit"
            disabled={!content.trim() || isOverLimit}
          >
            发布
          </button>
        </form>
      </div>
    </div>
  )
}

export default PostForm
