import { useRef, useEffect, useCallback, useState } from 'react'
import './CodeEditor.css'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onApply: () => void
  onClear: () => void
  label: string
  variant: 'left' | 'right'
  diffLineNumbers?: number[]
  diffEnabled?: boolean
}

export function CodeEditor({
  value,
  onChange,
  onApply,
  onClear,
  label,
  variant,
  diffLineNumbers = [],
  diffEnabled = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(newValue)
    }, 300)
  }, [onChange])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const lineCount = localValue.split('\n').length

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    const lineNumbers = lineNumbersRef.current

    if (highlight) {
      highlight.scrollTop = textarea?.scrollTop || 0
      highlight.scrollLeft = textarea?.scrollLeft || 0
    }
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea?.scrollTop || 0
    }
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      handleScroll()
    }
  }, [localValue, handleScroll])

  const bgColor = variant === 'left' ? 'rgba(255, 107, 107, 0.25)' : 'rgba(81, 207, 102, 0.25)'
  const solidBgColor = variant === 'left' ? '#ffcccc' : '#ccffcc'
  const borderColor = variant === 'left' ? '#ff6b6b' : '#51cf66'

  const diffSet = new Set(diffLineNumbers)

  return (
    <div className="code-editor">
      <div className="editor-header">
        <span className="editor-label" style={{ borderLeftColor: borderColor }}>
          {label}
        </span>
        <div className="editor-buttons">
          <button
            type="button"
            className="clear-btn"
            onClick={onClear}
          >
            清空
          </button>
          <button
            type="button"
            className="apply-btn"
            onClick={onApply}
          >
            套用
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-number ${diffEnabled && diffSet.has(i) ? 'diff-line' : ''}`}
              style={diffEnabled && diffSet.has(i) ? { background: solidBgColor, color: '#333' } : {}}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="editor-content">
          {diffEnabled && diffLineNumbers.length > 0 && (
            <pre
              ref={highlightRef}
              className="code-highlight"
              aria-hidden="true"
            >
              {localValue.split('\n').map((line, index) => (
                <div
                  key={index}
                  className={`highlight-line ${diffSet.has(index) ? 'diff' : ''}`}
                  style={diffSet.has(index) ? { background: solidBgColor } : {}}
                >
                  {line || ' '}
                </div>
              ))}
            </pre>
          )}

          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onScroll={handleScroll}
            className="code-textarea"
            spellCheck={false}
            style={diffEnabled && diffLineNumbers.length > 0 ? { color: 'transparent', caretColor: '#e0e0f0' } : {}}
          />
        </div>
      </div>
    </div>
  )
}
