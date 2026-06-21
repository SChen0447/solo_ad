import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  max?: number
  disabled?: boolean
}

export function TagsInput({ value, onChange, suggestions, max = 5, disabled = false }: Props) {
  const [input, setInput] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const [showAuto, setShowAuto] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowAuto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = suggestions
    .filter(s => !value.includes(s) && s.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8)

  const customOption = input.trim() &&
    !value.includes(input.trim()) &&
    !suggestions.some(s => s.toLowerCase() === input.trim().toLowerCase())

  function removeTag(t: string) {
    if (disabled) return
    onChange(value.filter(x => x !== t))
  }

  function addTag(t: string) {
    if (disabled) return
    const trimmed = t.trim()
    if (!trimmed || value.includes(trimmed)) return
    if (value.length >= max) return
    onChange([...value, trimmed])
    setInput('')
    setActiveIdx(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = filtered.length + (customOption ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        addTag(filtered[activeIdx])
      } else if (activeIdx === filtered.length && customOption) {
        addTag(input.trim())
      } else if (input.trim()) {
        addTag(input.trim())
      }
    } else if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1])
    } else if (e.key === ',') {
      e.preventDefault()
      if (input.trim()) addTag(input.trim())
    } else if (e.key === 'Escape') {
      setShowAuto(false)
    }
  }

  return (
    <div className="tags-input-wrap" ref={wrapRef}>
      {value.length > 0 && (
        <div className="tags-selected">
          {value.map(t => (
            <span key={t} className="tag-chip" onClick={() => removeTag(t)} title="移除标签">
              #{t}
              <X size={12} style={{ marginLeft: '2px' }} />
            </span>
          ))}
        </div>
      )}
      <input
        className="form-input"
        placeholder={value.length >= max ? '已达到标签上限' : '输入标签，回车或逗号确认…'}
        value={input}
        disabled={disabled || value.length >= max}
        onChange={e => {
          setInput(e.target.value)
          setActiveIdx(-1)
          setShowAuto(true)
        }}
        onFocus={() => setShowAuto(true)}
        onKeyDown={onKeyDown}
      />
      {showAuto && (filtered.length > 0 || customOption) && (
        <div className="tags-autocomplete" role="listbox">
          {filtered.map((s, idx) => (
            <div
              key={s}
              className={idx === activeIdx ? 'active' : ''}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => addTag(s)}
            >
              {s} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>· 已有标签</span>
            </div>
          ))}
          {customOption && (
            <div
              className={activeIdx === filtered.length ? 'active' : ''}
              onMouseEnter={() => setActiveIdx(filtered.length)}
              onClick={() => addTag(input.trim())}
            >
              创建「{input.trim()}」
            </div>
          )}
        </div>
      )}
      <div className="tag-hint">最多添加 {max} 个标签，点击已选标签可移除</div>
    </div>
  )
}
