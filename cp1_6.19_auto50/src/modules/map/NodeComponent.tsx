import React, { useRef, useEffect, useState } from 'react'
import { StoryNode, StoryOption } from '../../store/useStoryStore'

interface NodeComponentProps {
  node: StoryNode
  isSelected: boolean
  scale: number
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, optionId?: string) => void
}

const NODE_WIDTH = 240
const PORT_RADIUS = 8

export const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  scale,
  isDragging,
  onMouseDown,
  onPortMouseDown,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(80)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(Math.min(120, Math.max(60, contentRef.current.scrollHeight + 20)))
    }
  }, [node.content, node.options.length])

  const totalHeight = 60 + contentHeight + (node.options.length > 0 ? 40 + node.options.length * 32 : 20)

  const fontSize = Math.max(10, 12 * scale)
  const titleFontSize = Math.max(10, 14 * scale)

  return (
    <div
      ref={nodeRef}
      className={`story-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        minHeight: totalHeight,
        backgroundColor: '#2d2d2d',
        border: `2px solid ${isSelected ? '#4fc3f7' : '#555555'}`,
        borderRadius: '10px',
        boxShadow: isSelected
          ? '0 0 20px rgba(79, 195, 247, 0.5)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        cursor: 'move',
        userSelect: 'none',
        opacity: isDragging ? 0.7 : 1,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        animation: 'fadeIn 0.3s ease-out',
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #444',
          fontSize: titleFontSize,
          fontWeight: 600,
          color: '#e0e0e0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {node.title || '未命名节点'}
      </div>

      <div
        ref={contentRef}
        style={{
          padding: '8px 12px',
          fontSize: fontSize,
          color: '#a0a0a0',
          lineHeight: 1.4,
          maxHeight: '100px',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {node.content || '双击编辑内容...'}
      </div>

      {node.options.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #444',
          }}
        >
          <div
            style={{
              fontSize: Math.max(9, 10 * scale),
              color: '#888',
              marginBottom: '6px',
            }}
          >
            选项 ({node.options.length})
          </div>
          {node.options.map((option, idx) => (
            <OptionPort
              key={option.id}
              option={option}
              index={idx}
              scale={scale}
              onPortMouseDown={(e) => onPortMouseDown(e, node.id, option.id)}
            />
          ))}
        </div>
      )}

      <div
        className="input-port"
        style={{
          position: 'absolute',
          left: -PORT_RADIUS,
          top: '50%',
          transform: 'translateY(-50%)',
          width: PORT_RADIUS * 2,
          height: PORT_RADIUS * 2,
          borderRadius: '50%',
          backgroundColor: '#2d2d2d',
          border: '2px solid #888',
          cursor: 'crosshair',
          transition: 'all 0.2s ease',
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          onPortMouseDown(e, node.id)
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#4fc3f7'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#4fc3f7'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#888'
        }}
      />
    </div>
  )
}

interface OptionPortProps {
  option: StoryOption
  index: number
  scale: number
  onPortMouseDown: (e: React.MouseEvent) => void
}

const OptionPort: React.FC<OptionPortProps> = ({
  option,
  index,
  scale,
  onPortMouseDown,
}) => {
  const fontSize = Math.max(9, 11 * scale)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 28,
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: fontSize,
          color: '#b0b0b0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          paddingRight: '20px',
        }}
      >
        {index + 1}. {option.text || '未命名选项'}
      </span>
      <div
        style={{
          position: 'absolute',
          right: -PORT_RADIUS,
          top: '50%',
          transform: 'translateY(-50%)',
          width: PORT_RADIUS * 2,
          height: PORT_RADIUS * 2,
          borderRadius: '50%',
          backgroundColor: option.targetNodeId ? '#4fc3f7' : '#2d2d2d',
          border: `2px solid ${option.targetNodeId ? '#4fc3f7' : '#888'}`,
          cursor: 'crosshair',
          transition: 'all 0.2s ease',
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          onPortMouseDown(e)
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#4fc3f7'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = '#4fc3f7'
        }}
        onMouseLeave={(e) => {
          if (!option.targetNodeId) {
            ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d2d'
            ;(e.currentTarget as HTMLDivElement).style.borderColor = '#888'
          }
        }}
      />
    </div>
  )
}
