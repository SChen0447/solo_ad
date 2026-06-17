import { useEffect, useRef } from 'react'
import katex from 'katex'
import type { HistoryItem } from '../App'

interface HistoryPanelProps {
  history: HistoryItem[]
  isOpen: boolean
  onToggle: () => void
  onSelect: (item: HistoryItem) => void
}

interface ThumbProps {
  formula: string
}

function Thumb({ formula }: ThumbProps) {
  const ref = useRef<HTMLDivElement>(null)
  const renderedRef = useRef<string>('')

  useEffect(() => {
    if (!ref.current) return
    if (renderedRef.current === formula) return
    renderedRef.current = formula
    try {
      katex.render(formula, ref.current, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
        strict: false,
        trust: true
      })
    } catch {
      if (ref.current) {
        ref.current.innerHTML = ''
        const text = document.createElement('span')
        text.style.fontSize = '13px'
        text.style.color = '#6b7280'
        text.style.fontFamily = 'Consolas, Monaco, monospace'
        text.style.wordBreak = 'break-all'
        text.textContent = formula.length > 30 ? formula.substring(0, 30) + '...' : formula
        ref.current.appendChild(text)
      }
    }
  }, [formula])

  return <div ref={ref} className="history-thumb" />
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function HistoryPanel({ history, isOpen, onToggle, onSelect }: HistoryPanelProps) {
  return (
    <>
      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              历史记录
            </h3>
            <button className="sidebar-close desktop-only" onClick={onToggle} title="收起">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>暂无历史记录</p>
              <p className="history-empty-sub">编辑公式后将自动保存最近5条</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => onSelect(item)}
                  title={`点击回滚到该版本（${formatTime(item.timestamp)}）`}
                >
                  <div className="history-item-header">
                    <span className="history-item-index">#{history.length - index}</span>
                    <span className="history-item-time">{formatTime(item.timestamp)}</span>
                  </div>
                  <Thumb formula={item.formula} />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {!isOpen && (
        <button className="sidebar-toggle desktop-only" onClick={onToggle} title="展开历史记录">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      )}
    </>
  )
}

export default HistoryPanel
