import React, { useState } from 'react'
import { PEN_COLORS, PEN_WIDTHS, NOTE_COLOR_MAP, type NoteColor } from '../shared/types'

interface ToolbarProps {
  penColor: string
  penWidth: number
  noteColor: NoteColor
  canUndo: boolean
  canRedo: boolean
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: number) => void
  onNoteColorChange: (color: NoteColor) => void
  onAddNote: () => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  penColor,
  penWidth,
  noteColor,
  canUndo,
  canRedo,
  onPenColorChange,
  onPenWidthChange,
  onNoteColorChange,
  onAddNote,
  onUndo,
  onRedo,
  onClear
}) => {
  const [showNoteColors, setShowNoteColors] = useState(false)
  const noteColors: NoteColor[] = ['yellow', 'pink', 'blue']

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">颜色</div>
        <div className="toolbar-colors">
          {PEN_COLORS.map((color) => (
            <button
              key={color}
              className={`tool-btn color-btn ${penColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onPenColorChange(color)}
              title={`画笔颜色: ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="toolbar-label">粗细</div>
        <div className="toolbar-widths">
          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              className={`tool-btn width-btn ${penWidth === w ? 'active' : ''}`}
              onClick={() => onPenWidthChange(w)}
              title={`画笔粗细: ${w}px`}
            >
              <span
                className="width-dot"
                style={{ width: w * 2, height: w * 2 }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="toolbar-label">便签</div>
        <div className="toolbar-note-color">
          <div className="note-color-wrapper">
            <button
              className="tool-btn note-color-btn"
              style={{ backgroundColor: NOTE_COLOR_MAP[noteColor] }}
              onClick={() => setShowNoteColors(!showNoteColors)}
              title="选择便签颜色"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </button>
            {showNoteColors && (
              <div className="note-color-dropdown">
                {noteColors.map((nc) => (
                  <button
                    key={nc}
                    className={`note-color-option ${noteColor === nc ? 'selected' : ''}`}
                    style={{ backgroundColor: NOTE_COLOR_MAP[nc] }}
                    onClick={() => {
                      onNoteColorChange(nc)
                      setShowNoteColors(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            className="tool-btn add-note-btn"
            onClick={onAddNote}
            title="添加便签"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="toolbar-label">操作</div>
        <div className="toolbar-actions">
          <button
            className={`tool-btn action-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
          <button
            className={`tool-btn action-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
            title="重做"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <button
            className="tool-btn action-btn clear-btn"
            onClick={onClear}
            title="清空画布"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
