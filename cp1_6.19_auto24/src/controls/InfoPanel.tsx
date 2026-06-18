import React, { useRef, useEffect } from 'react'
import { useStore } from '../store'
import type { ProcessedCell } from '../types'

interface InfoPanelProps {
  cells: ProcessedCell[]
}

const InfoPanel: React.FC<InfoPanelProps> = ({ cells }) => {
  const selectedCellIndex = useStore((s) => s.selectedCellIndex)
  const currentTimeIndex = useStore((s) => s.currentTimeIndex)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedCell = selectedCellIndex !== null ? cells[selectedCellIndex] : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !selectedCell) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = { top: 10, right: 10, bottom: 20, left: 28 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const data = selectedCell.history
    const maxVal = 100
    const minVal = 0
    const range = maxVal - minVal || 1

    ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#666'
    ctx.font = '9px Arial'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(maxVal - (i / 4) * (maxVal - minVal))
      const y = padding.top + (i / 4) * chartHeight
      ctx.fillText(String(val), padding.left - 4, y)
    }

    ctx.fillStyle = '#555'
    ctx.textAlign = 'center'
    ctx.font = '8px Arial'
    const step = Math.max(1, Math.floor(data.length / 6))
    for (let i = 0; i < data.length; i += step) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth
      ctx.fillText(`T${i + 1}`, x, height - padding.bottom + 10)
    }

    ctx.beginPath()
    data.forEach((val, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth
      const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.strokeStyle = '#00aaff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight)
    ctx.lineTo(padding.left, padding.top + chartHeight)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, 'rgba(0, 170, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 170, 255, 0.02)')
    ctx.fillStyle = gradient
    ctx.fill()

    data.forEach((val, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth
      const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight
      ctx.beginPath()
      ctx.arc(x, y, i === currentTimeIndex ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = i === currentTimeIndex ? '#ffff00' : '#00aaff'
      ctx.fill()
      if (i === currentTimeIndex) {
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }, [selectedCell, currentTimeIndex])

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: 220,
        background: 'rgba(20, 20, 30, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: 12,
        zIndex: 100,
        color: '#e0e0e0',
        fontSize: 13,
        border: '1px solid rgba(0, 170, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.3s ease'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: selectedCell ? '#00ff88' : '#555',
            boxShadow: selectedCell ? '0 0 8px rgba(0, 255, 136, 0.6)' : 'none'
          }}
        />
        <span style={{ fontWeight: 'bold', color: '#fff', fontSize: 14 }}>
          网格信息
        </span>
      </div>

      {selectedCell ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>坐标 (X, Y)</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>
                ({selectedCell.x}, {selectedCell.y})
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>时间点</span>
              <span style={{ fontFamily: 'monospace', color: '#00aaff' }}>
                T{currentTimeIndex + 1}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>当前密度</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color:
                    selectedCell.currentDensity >= 75
                      ? '#ff6b6b'
                      : selectedCell.currentDensity >= 50
                      ? '#ffaa66'
                      : selectedCell.currentDensity >= 25
                      ? '#66ccff'
                      : '#88aaff'
                }}
              >
                {selectedCell.currentDensity.toFixed(0)} / 100
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: 8,
                background: '#333',
                borderRadius: 4,
                overflow: 'hidden',
                marginTop: 4
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${selectedCell.currentDensity}%`,
                  background: `linear-gradient(90deg, 
                    ${selectedCell.currentDensity <= 50 ? '#0000ff' : '#ff0000'}, 
                    ${selectedCell.currentDensity <= 50 ? '#ff0000' : '#ffffff'})`,
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 8px rgba(255,255,255,0.2)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>建筑高度</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                {selectedCell.buildingHeight.toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>柱体高度</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                {selectedCell.heightScale.toFixed(2)}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#888',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              历史变化趋势
            </div>
            <canvas
              ref={canvasRef}
              width={196}
              height={100}
              style={{
                width: '100%',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)'
              }}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            color: '#555',
            fontSize: 12,
            textAlign: 'center',
            padding: '24px 8px',
            lineHeight: 1.6
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              margin: '0 auto 12px',
              borderRadius: '50%',
              border: '2px dashed #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}
          >
            👆
          </div>
          点击任意网格柱体查看详细信息和历史趋势
        </div>
      )}
    </div>
  )
}

export default InfoPanel
