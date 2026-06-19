import React, { useState } from 'react'
import ThemeSelector from './ThemeSelector'
import type { Theme, ThemeId } from '../types'

interface ControlPanelProps {
  roomId: string
  onlineCount: number
  isTeacher: boolean
  themes: Theme[]
  selectedThemeId: ThemeId
  onThemeChange: (themeId: ThemeId) => void
  onClear: () => void
  onExport: () => void
}

const CopyIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const UsersIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const TrashIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
)

const DownloadIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const ControlPanel: React.FC<ControlPanelProps> = ({
  roomId,
  onlineCount,
  isTeacher,
  themes,
  selectedThemeId,
  onThemeChange,
  onClear,
  onExport
}) => {
  const [showCopied, setShowCopied] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 1500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = roomId
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 1500)
    }
  }

  const handleExport = () => {
    setExportLoading(true)
    setTimeout(() => {
      onExport()
      setExportLoading(false)
    }, 600)
  }

  return (
    <div className="control-panel">
      <div className="panel-section">
        <span className="panel-title">房间信息</span>
        <div className="room-info">
          <div className="room-code">
            {roomId}
            <button className="copy-btn" onClick={handleCopy} title="复制房间号">
              <CopyIcon />
              {showCopied && <span className="copy-tooltip">已复制</span>}
            </button>
          </div>
        </div>
        <div className="online-count">
          <UsersIcon />
          <span>在线人数：<span className="online-number">{onlineCount}</span></span>
        </div>
      </div>

      {isTeacher && (
        <ThemeSelector
          themes={themes}
          selectedThemeId={selectedThemeId}
          onSelect={onThemeChange}
        />
      )}

      {isTeacher && (
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={onClear} title="清空词云">
            <TrashIcon />
            清空
          </button>
          <button className="btn" onClick={handleExport} disabled={exportLoading} title="导出PNG">
            {exportLoading ? <span className="spinner" /> : <DownloadIcon />}
            {exportLoading ? '导出中' : '导出'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ControlPanel
