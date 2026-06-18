import { useRef, useEffect, useCallback } from 'react'
import './CodeEditor.css'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onApply: () => void
  label: string
  variant: 'left' | 'right'
  diffLineNumbers?: number[]
  diffEnabled?: boolean
}

export function CodeEditor({
  value,
  onChange,
  onApply,
  label,
  variant,
  diffLineNumbers = [],
  diffEnabled = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const lineCount = value.split('\n').length

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
  }, [value, handleScroll])

  const renderHighlightedLines = () => {
    if (!diffEnabled || diffLineNumbers.length === 0) {
      return value
    }

    const lines = value.split('\n')
    const diffSet = new Set(diffLineNumbers)

    return lines.map((line, index) => {
      const isDiff = diffSet.has(index)
      if (isDiff) {
        return line
      }
      return line
    }).join('\n')
  }

  const bgColor = variant === 'left' ? 'rgba(255, 107, 107, 0.15)' : 'rgba(81, 207, 102, 0.15)'
  const borderColor = variant === 'left' ? '#ff6b6b' : '#51cf66'

  return (
    <div className="code-editor">
      <div className="editor-header">
        <span className="editor-label" style={{ borderLeftColor: borderColor }}>
          {label}
        </span>
        <button
          type="button"
          className="apply-btn"
          onClick={onApply}
        >
          套用
        </button>
      </div>

      <div className="editor-body">
        <div className="line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-number ${diffEnabled && diffLineNumbers.includes(i) ? 'diff-line' : ''}`}
              style={diffEnabled && diffLineNumbers.includes(i) ? { background: bgColor } : {}}
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
              {value.split('\n').map((line, index) => (
                <div
                  key={index}
                  className={`highlight-line ${diffLineNumbers.includes(index) ? 'diff' : ''}`}
                  style={diffLineNumbers.includes(index) ? { background: bgColor } : {}}
                >
                  {line || ' '}
                </div>
              ))}
            </pre>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
