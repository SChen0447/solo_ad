import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import katex from 'katex'

interface PreviewProps {
  formula: string
}

export interface PreviewRef {
  hasError: () => boolean
  isEmpty: () => boolean
}

interface ParsedError {
  type: 'missing_closing' | 'unknown_command' | 'bracket_mismatch' | 'syntax' | 'other'
  typeLabel: string
  charPosition: number | null
  lineNumber: number | null
  column: number | null
  detail: string
  rawMessage: string
}

function parseKatexError(err: unknown, formula: string): ParsedError {
  const katexError = err as { message?: string }
  const rawMessage = katexError.message || '公式解析错误'

  let charPosition: number | null = null
  const posMatch = rawMessage.match(/at position (\d+)/i)
  if (posMatch) {
    charPosition = parseInt(posMatch[1], 10)
  }

  let lineNumber: number | null = null
  let column: number | null = null
  if (charPosition !== null) {
    const before = formula.substring(0, charPosition)
    const lines = before.split('\n')
    lineNumber = lines.length
    column = lines[lines.length - 1].length + 1
  }

  let type: ParsedError['type'] = 'other'
  let typeLabel = '解析错误'
  let detail = rawMessage

  if (/Unknown|Undefined|\\[a-zA-Z]/.test(rawMessage) && /command|function|symbol/i.test(rawMessage)) {
    type = 'unknown_command'
    typeLabel = '未知命令'
    const cmdMatch = rawMessage.match(/(\\[a-zA-Z]+)/)
    if (cmdMatch) {
      detail = `无法识别的 LaTeX 命令 "${cmdMatch[1]}"，请检查命令拼写是否正确`
    }
  } else if (/unexpected|expected|EOF|end of input/i.test(rawMessage)) {
    type = 'missing_closing'
    typeLabel = '缺少闭合'
    if (/brace|bracket|group/i.test(rawMessage)) {
      detail = '括号或花括号未正确闭合，请检查是否缺少 "}"、")" 或 "]"'
    } else {
      detail = '公式不完整，可能缺少闭合的花括号或其他语法元素'
    }
  } else if (/mismatch|match/i.test(rawMessage) && /brace|bracket|left|right/i.test(rawMessage)) {
    type = 'bracket_mismatch'
    typeLabel = '括号不匹配'
    detail = '\\left 和 \\right 括号类型不匹配，例如 \\left( ... \\right] 需要成对使用相同类型'
  } else if (charPosition !== null) {
    const around = formula.substring(Math.max(0, charPosition - 5), Math.min(formula.length, charPosition + 5))
    type = 'syntax'
    typeLabel = '语法错误'
    detail = `第 ${charPosition} 字符附近存在语法错误，上下文: "...${around}..."`
  }

  return {
    type,
    typeLabel,
    charPosition,
    lineNumber,
    column,
    detail,
    rawMessage
  }
}

const Preview = forwardRef<PreviewRef, PreviewProps>(({ formula }, ref) => {
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [parsedError, setParsedError] = useState<ParsedError | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasErrorRef = useRef(false)
  const isEmptyRef = useRef(true)

  useImperativeHandle(ref, () => ({
    hasError: () => hasErrorRef.current,
    isEmpty: () => isEmptyRef.current
  }))

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      isEmptyRef.current = formula.trim().length === 0
      if (formula.trim().length === 0) {
        setRenderedHtml('')
        setParsedError(null)
        hasErrorRef.current = false
        return
      }
      try {
        const html = katex.renderToString(formula, {
          throwOnError: true,
          displayMode: true,
          output: 'html'
        })
        setRenderedHtml(html)
        setParsedError(null)
        hasErrorRef.current = false
      } catch (err: unknown) {
        const parsed = parseKatexError(err, formula)
        setParsedError(parsed)
        hasErrorRef.current = true
        setRenderedHtml('')
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [formula])

  const renderLocation = () => {
    if (!parsedError) return null
    const parts: string[] = []
    if (parsedError.charPosition !== null) {
      parts.push(`第 ${parsedError.charPosition} 字符`)
    }
    if (parsedError.lineNumber !== null) {
      parts.push(`第 ${parsedError.lineNumber} 行`)
    }
    if (parsedError.column !== null) {
      parts.push(`第 ${parsedError.column} 列`)
    }
    if (parts.length === 0) return null
    return `（${parts.join('，')}附近）`
  }

  return (
    <div className="preview">
      {parsedError ? (
        <div className="preview-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="preview-error-title">
              {parsedError.typeLabel}{renderLocation()}
            </div>
            <div className="preview-error-message">{parsedError.detail}</div>
            {parsedError.charPosition !== null && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                borderRadius: '4px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12px',
                lineHeight: 1.6,
                wordBreak: 'break-all',
                color: '#1f2937',
                border: '1px solid #fecaca'
              }}>
                <span style={{ color: '#1f2937' }}>{formula.substring(0, parsedError.charPosition)}</span>
                <span style={{
                  backgroundColor: '#fca5a5',
                  color: '#7f1d1d',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  fontWeight: 'bold'
                }}>{formula[parsedError.charPosition] || ' '}</span>
                <span style={{ color: '#6b7280' }}>{formula.substring(parsedError.charPosition + 1)}</span>
              </div>
            )}
          </div>
        </div>
      ) : renderedHtml ? (
        <div
          className="katex-display"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>
          在上方输入公式后，这里将显示实时渲染预览
        </div>
      )}
    </div>
  )
})

Preview.displayName = 'Preview'

export default Preview
