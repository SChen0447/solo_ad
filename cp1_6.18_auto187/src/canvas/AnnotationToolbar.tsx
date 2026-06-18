import React from 'react'
import { useAnnotationStore } from '../store/annotationStore'
import type { ToolType } from '../types'

interface ToolButton {
  tool: ToolType
  icon: React.ReactNode
  label: string
}

const SelectIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
  </svg>
)

const ArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const RectangleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="2" ry="2"/>
  </svg>
)

const EllipseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="12" rx="9" ry="6"/>
  </svg>
)

const BrushIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
    <circle cx="11" cy="11" r="1"/>
  </svg>
)

const DeleteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>
)

const tools: ToolButton[] = [
  { tool: 'select', label: '选择', icon: <SelectIcon /> },
  { tool: 'arrow', label: '箭头', icon: <ArrowIcon /> },
  { tool: 'rectangle', label: '矩形', icon: <RectangleIcon /> },
  { tool: 'ellipse', label: '椭圆', icon: <EllipseIcon /> },
  { tool: 'brush', label: '画笔', icon: <BrushIcon /> },
  { tool: 'delete', label: '删除', icon: <DeleteIcon /> },
]

export const AnnotationToolbar: React.FC = () => {
  const { currentTool, setCurrentTool, deleteSelectedAnnotation, clearAll, backgroundImage } = useAnnotationStore()

  return (
    <div className="toolbar">
      <div className="toolbar-buttons">
        {tools.map(({ tool, icon, label }) => (
          <button
            key={tool}
            className={`tool-button ${currentTool === tool ? 'active' : ''}`}
            onClick={() => setCurrentTool(tool)}
            title={label}
            disabled={!backgroundImage && tool !== 'select'}
          >
            {icon}
            <span className="tool-label">{label}</span>
          </button>
        ))}
      </div>
      
      <div className="toolbar-divider"></div>
      
      <div className="toolbar-actions">
        <button
          className="action-button"
          onClick={deleteSelectedAnnotation}
          disabled={!useAnnotationStore.getState().selectedAnnotationId}
          title="删除选中"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
        <button
          className="action-button"
          onClick={clearAll}
          title="清空所有"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
