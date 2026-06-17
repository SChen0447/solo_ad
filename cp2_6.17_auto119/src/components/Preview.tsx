import { useState, useEffect, useRef } from 'react'
import katex from 'katex'

interface PreviewProps {
  formula: string
}

function Preview({ formula }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      try {
        const html = katex.renderToString(formula, {
          throwOnError: true,
          displayMode: true,
          output: 'html'
        })
        setRenderedHtml(html)
        setError(null)
        setErrorLine(null)
      } catch (err: unknown) {
        const katexError = err as { message?: string }
        setError(katexError.message || '公式解析错误')
        const match = katexError.message?.match(/at position (\d+)/)
        if (match) {
          const pos = parseInt(match[1], 10)
          const before = formula.substring(0, pos)
          setErrorLine(before.split('\n').length)
        }
        setRenderedHtml('')
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [formula])

  return (
    <div className="preview" ref={containerRef}>
      {error ? (
        <div className="preview-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <div className="preview-error-title">
              公式解析错误{errorLine !== null ? `（第 ${errorLine} 行）` : ''}
            </div>
            <div className="preview-error-message">{error}</div>
          </div>
        </div>
      ) : (
        <div
          className="katex-display"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  )
}

export default Preview
