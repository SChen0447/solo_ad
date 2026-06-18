import { useRef } from 'react'
import { GridCanvas } from './GridCanvas'
import { useGridStore } from './store'
import { exportGridAsPng } from './export'

export default function App() {
  const clearGrid = useGridStore((s) => s.clearGrid)
  const randomFill = useGridStore((s) => s.randomFill)
  const gridRef = useRef<HTMLDivElement>(null)

  const handleExport = () => {
    const gridElement = document.getElementById('grid-canvas')
    if (gridElement) {
      exportGridAsPng(gridElement)
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 56,
        }}
      >
        <GridCanvas />
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 100,
        }}
      >
        <button
          onClick={clearGrid}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          清除全部
        </button>

        <button
          onClick={randomFill}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          随机生成
        </button>

        <button
          onClick={handleExport}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
          }}
        >
          导出图像
        </button>
      </div>
    </div>
  )
}
