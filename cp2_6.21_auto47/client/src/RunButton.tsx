import { useState, useRef } from 'react'

export interface RunResult {
  output: string
  userId: string
  username: string
  timestamp: number
}

interface RunButtonProps {
  onRun: () => void
  isRunning: boolean
  onClearOutput: () => void
}

export default function RunButton({ onRun, isRunning, onClearOutput }: RunButtonProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={onRun}
        disabled={isRunning}
        style={{
          padding: '8px 20px',
          backgroundColor: isRunning ? '#6B7280' : '#10B981',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isRunning) {
            e.currentTarget.style.backgroundColor = '#34D399'
          }
        }}
        onMouseLeave={(e) => {
          if (!isRunning) {
            e.currentTarget.style.backgroundColor = '#10B981'
          }
        }}
      >
        {isRunning ? '运行中...' : '▶ 运行'}
      </button>
      <button
        onClick={onClearOutput}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6B7280',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#9CA3AF'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6B7280'
        }}
      >
        清除输出
      </button>
    </div>
  )
}

interface OutputPanelProps {
  output: RunResult | null
}

export function OutputPanel({ output }: OutputPanelProps) {
  const [outputHeight, setOutputHeight] = useState(150)
  const isResizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(150)

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true
    startY.current = e.clientY
    startHeight.current = outputHeight
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const diff = startY.current - e.clientY
      const newHeight = Math.min(300, Math.max(100, startHeight.current + diff))
      setOutputHeight(newHeight)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '1px',
          backgroundColor: '#4B5563',
          cursor: 'row-resize',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '6px',
            backgroundColor: '#4B5563',
            borderRadius: '3px',
          }}
        />
      </div>

      <div
        style={{
          height: `${outputHeight}px`,
          backgroundColor: '#111827',
          color: '#E5E7EB',
          padding: '12px',
          overflowY: 'auto',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          boxSizing: 'border-box',
        }}
        className="output-panel"
      >
        <style>{`
          .output-panel::-webkit-scrollbar {
            width: 6px;
          }
          .output-panel::-webkit-scrollbar-track {
            background: transparent;
          }
          .output-panel::-webkit-scrollbar-thumb {
            background-color: #4B5563;
            border-radius: 3px;
          }
        `}</style>

        {output ? (
          <>
            <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
              {output.username} 运行于 {new Date(output.timestamp).toLocaleTimeString()}
            </div>
            <div>{output.output}</div>
          </>
        ) : (
          <div style={{ color: '#6B7280' }}>点击运行按钮执行代码，输出将显示在这里</div>
        )}
      </div>
    </div>
  )
}
