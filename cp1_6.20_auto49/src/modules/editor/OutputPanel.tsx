import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import './OutputPanel.css'

export interface Snapshot {
  id: string
  timestamp: number
  code: string
  result: CodeResult
  summary: string
  pinned: boolean
}

export interface CodeResult {
  text: string
  html: string | null
  error: string | null
  duration: number
}

interface OutputPanelProps {
  result: CodeResult | null
  isLoading: boolean
  currentCode: string
  onRestoreSnapshot?: (code: string, result: CodeResult) => void
}

const OutputPanel: React.FC<OutputPanelProps> = ({
  result,
  isLoading,
  currentCode,
  onRestoreSnapshot,
}) => {
  const [renderMode, setRenderMode] = useState<'text' | 'html'>('text')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSnapshots, setShowSnapshots] = useState(true)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const filteredSnapshots = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [...snapshots].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.timestamp - a.timestamp
      })
    }
    const query = debouncedQuery.toLowerCase()
    return snapshots
      .filter(
        (s) =>
          s.summary.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query) ||
          s.result.text.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.timestamp - a.timestamp
      })
  }, [snapshots, debouncedQuery])

  const saveSnapshot = useCallback(() => {
    if (!result) return

    const summary = result.text.substring(0, 50) + (result.text.length > 50 ? '...' : '')
    const newSnapshot: Snapshot = {
      id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      code: currentCode,
      result: { ...result },
      summary,
      pinned: false,
    }
    setSnapshots((prev) => [newSnapshot, ...prev])
  }, [result, currentCode])

  const togglePin = useCallback((id: string) => {
    setSnapshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    )
  }, [])

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const restoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      if (onRestoreSnapshot) {
        onRestoreSnapshot(snapshot.code, snapshot.result)
      }
    },
    [onRestoreSnapshot]
  )

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const renderTextOutput = () => {
    if (!result) return null

    if (result.error) {
      return (
        <pre className="output-error">
          <span className="error-icon">✕</span>
          {result.error}
        </pre>
      )
    }

    return (
      <pre className="output-text">
        {result.text.split('\n').map((line, i) => (
          <div key={i} className="output-line">
            <span className="line-number">{i + 1}</span>
            <span className="line-content">{line || ' '}</span>
          </div>
        ))}
      </pre>
    )
  }

  const renderHtmlOutput = () => {
    if (!result || !result.html) {
      return (
        <div className="output-empty">
          <p>暂无 HTML 输出</p>
          <p className="hint">运行包含绘图的代码可在此显示图表</p>
        </div>
      )
    }

    return (
      <div
        className="output-html"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    )
  }

  return (
    <div className="output-panel">
      <div className="output-header">
        <div className="output-tabs">
          <button
            className={`tab-btn ${renderMode === 'text' ? 'active' : ''}`}
            onClick={() => setRenderMode('text')}
          >
            文本输出
          </button>
          <button
            className={`tab-btn ${renderMode === 'html' ? 'active' : ''}`}
            onClick={() => setRenderMode('html')}
          >
            HTML 输出
          </button>
        </div>
        <div className="output-actions">
          <button className="action-btn" onClick={saveSnapshot} disabled={!result}>
            📷 保存快照
          </button>
          <button
            className="action-btn toggle-btn"
            onClick={() => setShowSnapshots(!showSnapshots)}
          >
            {showSnapshots ? '◀' : '▶'}
          </button>
        </div>
      </div>

      <div className="output-content-wrapper">
        <div className="output-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-gear loading-spinner">⚙</div>
              <p>正在执行 R 代码...</p>
            </div>
          ) : !result ? (
            <div className="output-empty">
              <div className="empty-icon">▶</div>
              <p>点击运行按钮执行代码</p>
              <p className="hint">结果将显示在这里</p>
            </div>
          ) : renderMode === 'text' ? (
            renderTextOutput()
          ) : (
            renderHtmlOutput()
          )}

          {result && !isLoading && (
            <div className="output-footer">
              <span className="duration">
                执行耗时: {(result.duration * 1000).toFixed(0)}ms
              </span>
              {result.error && (
                <span className="error-badge">执行出错</span>
              )}
            </div>
          )}
        </div>

        {showSnapshots && (
          <div className="snapshots-panel">
            <div className="snapshots-header">
              <h3>分析快照</h3>
              <span className="snapshot-count">{snapshots.length} 个</span>
            </div>
            <div className="snapshot-search">
              <input
                type="search"
                placeholder="搜索快照..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="snapshots-list">
              {filteredSnapshots.length === 0 ? (
                <div className="snapshots-empty">
                  {debouncedQuery ? '没有匹配的快照' : '暂无快照'}
                </div>
              ) : (
                filteredSnapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`snapshot-item ${snapshot.pinned ? 'pinned' : ''}`}
                    onClick={() => restoreSnapshot(snapshot)}
                  >
                    <div className="snapshot-pin" onClick={(e) => {
                      e.stopPropagation()
                      togglePin(snapshot.id)
                    }}>
                      {snapshot.pinned ? '📌' : '📍'}
                    </div>
                    <div className="snapshot-content">
                      <div className="snapshot-time">
                        {formatTimestamp(snapshot.timestamp)}
                      </div>
                      <div className="snapshot-summary" title={snapshot.summary}>
                        {snapshot.summary}
                      </div>
                    </div>
                    <button
                      className="snapshot-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSnapshot(snapshot.id)
                      }}
                      title="删除快照"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OutputPanel
