import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TileType, LevelData } from '@/types'
import { validateLevel } from './LevelValidator'

const GRID_SIZE = 15
const BASE_CELL_SIZE = 40

interface ToolItem {
  type: TileType | 'eraser'
  name: string
  color: string
}

const TOOLS: ToolItem[] = [
  { type: 'path', name: '通路', color: '#4B5563' },
  { type: 'wall', name: '墙壁', color: '#1F2937' },
  { type: 'entangled', name: '纠缠门', color: '#F59E0B' },
  { type: 'trap', name: '陷阱', color: '#EF4444' },
  { type: 'observer', name: '观测站', color: '#10B981' },
  { type: 'start', name: '入口', color: '#3B82F6' },
  { type: 'exit', name: '出口', color: '#8B5CF6' },
  { type: 'eraser', name: '橡皮擦', color: '#6B7280' },
]

interface FlashCell {
  x: number
  y: number
  timestamp: number
}

interface ToastState {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

interface EditorPanelProps {
  onBack: () => void
}

const EditorPanel: React.FC<EditorPanelProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedTool, setSelectedTool] = useState<TileType | 'eraser'>('wall')
  const [grid, setGrid] = useState<TileType[][]>(() =>
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill('wall' as TileType))
  )
  const [levelName, setLevelName] = useState('自定义关卡')
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    errors: string[]
    warnings: string[]
  } | null>(null)
  const [showExportedJson, setExportedJson] = useState<string>('')
  const [flashCells, setFlashCells] = useState<FlashCell[]>([])
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  })
  const [zoom, setZoom] = useState(1.0)

  const cellSize = Math.round(BASE_CELL_SIZE * zoom)
  const canvasSize = GRID_SIZE * cellSize

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 2000)
  }, [])

  useEffect(() => {
    const now = Date.now()
    const active = flashCells.filter(f => now - f.timestamp < 150)
    if (active.length !== flashCells.length) {
      setFlashCells(active)
    }
  }, [flashCells])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cs = cellSize
    const w = GRID_SIZE * cs
    const h = GRID_SIZE * cs

    canvas.width = w
    canvas.height = h

    ctx.fillStyle = '#0B0E17'
    ctx.fillRect(0, 0, w, h)

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid[y][x]
        const px = x * cs
        const py = y * cs

        let color = '#1F2937'
        switch (tile) {
          case 'path':
            color = '#4B5563'
            break
          case 'wall':
            color = '#1F2937'
            break
          case 'entangled':
            color = '#F59E0B'
            break
          case 'trap':
            color = '#EF4444'
            break
          case 'observer':
            color = '#10B981'
            break
          case 'start':
            color = '#3B82F6'
            break
          case 'exit':
            color = '#8B5CF6'
            break
        }

        ctx.fillStyle = color
        ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2)

        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, cs, cs)

        if (tile === 'start') {
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${Math.max(10, Math.round(cs * 0.35))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('S', px + cs / 2, py + cs / 2)
        }
        if (tile === 'exit') {
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${Math.max(10, Math.round(cs * 0.35))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('E', px + cs / 2, py + cs / 2)
        }
      }
    }

    const now = Date.now()
    for (const flash of flashCells) {
      const elapsed = now - flash.timestamp
      if (elapsed < 150) {
        const alpha = 1 - elapsed / 150
        const px = flash.x * cs
        const py = flash.y * cs
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = 2
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2)
      }
    }

    if (dragPos && isDragging) {
      ctx.strokeStyle = '#60A5FA'
      ctx.lineWidth = 2
      ctx.strokeRect(dragPos.x * cs, dragPos.y * cs, cs, cs)
    }
  }, [grid, dragPos, isDragging, cellSize, flashCells])

  const getGridPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / cellSize)
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / cellSize)

      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        return { x, y }
      }
      return null
    },
    [cellSize]
  )

  const paintCell = useCallback(
    (x: number, y: number) => {
      setGrid(prev => {
        const newGrid = prev.map(row => [...row])

        if (selectedTool === 'eraser') {
          newGrid[y][x] = 'wall'
        } else if (selectedTool === 'start') {
          for (let yy = 0; yy < GRID_SIZE; yy++) {
            for (let xx = 0; xx < GRID_SIZE; xx++) {
              if (newGrid[yy][xx] === 'start') {
                newGrid[yy][xx] = 'path'
              }
            }
          }
          newGrid[y][x] = 'start'
        } else if (selectedTool === 'exit') {
          for (let yy = 0; yy < GRID_SIZE; yy++) {
            for (let xx = 0; xx < GRID_SIZE; xx++) {
              if (newGrid[yy][xx] === 'exit') {
                newGrid[yy][xx] = 'path'
              }
            }
          }
          newGrid[y][x] = 'exit'
        } else {
          newGrid[y][x] = selectedTool
        }

        return newGrid
      })

      setFlashCells(prev => [...prev, { x, y, timestamp: Date.now() }])
    },
    [selectedTool]
  )

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPos(e)
    if (pos) {
      setIsDragging(true)
      setDragPos(pos)
      paintCell(pos.x, pos.y)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPos(e)
    if (pos) {
      setDragPos(pos)
      if (isDragging) {
        paintCell(pos.x, pos.y)
      }
    } else {
      setDragPos(null)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setDragPos(null)
  }

  const handleClear = () => {
    setGrid(
      Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill('wall' as TileType))
    )
    setValidationResult(null)
    setExportedJson('')
  }

  const handleValidate = () => {
    const result = validateLevel(grid)
    setValidationResult(result)
  }

  const handleExport = async () => {
    const result = validateLevel(grid)
    setValidationResult(result)

    if (!result.valid) {
      showToast('入口与出口不可达，请调整地形', 'error')
      return
    }

    const levelData: LevelData = {
      id: '',
      name: levelName,
      width: GRID_SIZE,
      height: GRID_SIZE,
      grid: grid,
      difficulty: 3,
    }

    const json = JSON.stringify(levelData, null, 2)
    setExportedJson(json)

    try {
      const response = await fetch('/api/levels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: json,
      })

      if (response.ok) {
        showToast('关卡校验通过，已导出为JSON文件', 'success')
      }
    } catch (err) {
      console.error('保存失败:', err)
    }
  }

  const handleDownloadJson = () => {
    const blob = new Blob([showExportedJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${levelName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ← 返回菜单
        </button>
        <h2 style={styles.title}>关卡编辑器</h2>
        <div style={{ width: '100px' }} />
      </div>

      <div style={styles.mainContent}>
        <div style={styles.toolbarBorder}>
          <div style={styles.toolbar}>
            <h3 style={styles.toolbarTitle}>工具栏</h3>
            <div style={styles.toolGrid}>
              {TOOLS.map(tool => (
                <div
                  key={tool.type}
                  style={{
                    ...styles.toolItemBase,
                    border:
                      selectedTool === tool.type
                        ? '2px solid #60A5FA'
                        : '2px solid transparent',
                  }}
                  onClick={() => setSelectedTool(tool.type)}
                >
                  <div
                    style={{
                      ...styles.toolIcon,
                      backgroundColor: tool.color,
                    }}
                  />
                  <span style={styles.toolName}>{tool.name}</span>
                </div>
              ))}
            </div>

            <div style={styles.actions}>
              <button style={styles.actionButton} onClick={handleClear}>
                清空
              </button>
              <button style={styles.actionButton} onClick={handleValidate}>
                校验
              </button>
              <button
                style={{ ...styles.actionButton, ...styles.primaryButton }}
                onClick={handleExport}
              >
                保存
              </button>
            </div>

            {validationResult && (
              <div style={styles.validationResult}>
                {validationResult.errors.length > 0 && (
                  <div style={styles.errorBox}>
                    <h4 style={styles.errorTitle}>错误：</h4>
                    <ul style={styles.errorList}>
                      {validationResult.errors.map((err, i) => (
                        <li key={i} style={styles.errorItem}>
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div style={styles.warningBox}>
                    <h4 style={styles.warningTitle}>警告：</h4>
                    <ul style={styles.warningList}>
                      {validationResult.warnings.map((warn, i) => (
                        <li key={i} style={styles.warningItem}>
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationResult.valid && validationResult.errors.length === 0 && (
                  <div style={styles.successBox}>✓ 关卡校验通过</div>
                )}
              </div>
            )}

            {showExportedJson && (
              <div style={styles.jsonSection}>
                <h4 style={styles.jsonTitle}>JSON 导出</h4>
                <textarea
                  value={showExportedJson}
                  readOnly
                  style={styles.jsonTextarea}
                />
                <button style={styles.downloadButton} onClick={handleDownloadJson}>
                  下载 JSON
                </button>
              </div>
            )}

            <div style={styles.zoomSection}>
              <label style={styles.zoomLabel}>
                缩放: {zoom.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={styles.zoomSlider}
              />
            </div>
          </div>
        </div>

        <div style={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{
              ...styles.canvas,
              width: canvasSize,
              height: canvasSize,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>
      </div>

      {toast.visible && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === 'success' ? '#1E293B' : '#7F1D1D',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '16px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  title: {
    color: '#E5E7EB',
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toolbarBorder: {
    borderRadius: '9px',
    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
    padding: '1px',
    width: '216px',
  },
  toolbar: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toolbarTitle: {
    color: '#E5E7EB',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  toolItemBase: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    background: 'rgba(55, 65, 81, 0.5)',
  },
  toolIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  toolName: {
    color: '#9CA3AF',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  actionButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #4B5563',
    background: 'transparent',
    color: '#D1D5DB',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
    border: 'none',
    color: 'white',
  },
  validationResult: {
    marginTop: '8px',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '8px',
  },
  errorTitle: {
    color: '#F87171',
    fontSize: '13px',
    margin: '0 0 4px 0',
  },
  errorList: {
    margin: 0,
    paddingLeft: '16px',
  },
  errorItem: {
    color: '#FCA5A5',
    fontSize: '12px',
  },
  warningBox: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '6px',
    padding: '8px',
    marginTop: '8px',
  },
  warningTitle: {
    color: '#FBBF24',
    fontSize: '13px',
    margin: '0 0 4px 0',
  },
  warningList: {
    margin: 0,
    paddingLeft: '16px',
  },
  warningItem: {
    color: '#FCD34D',
    fontSize: '12px',
  },
  successBox: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    padding: '8px',
    color: '#34D399',
    fontSize: '13px',
    textAlign: 'center',
  },
  jsonSection: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jsonTitle: {
    color: '#9CA3AF',
    fontSize: '13px',
    margin: 0,
  },
  jsonTextarea: {
    width: '100%',
    height: '120px',
    fontSize: '10px',
    fontFamily: 'monospace',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#9CA3AF',
    padding: '6px',
    resize: 'none',
  },
  downloadButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #4B5563',
    background: 'transparent',
    color: '#D1D5DB',
    cursor: 'pointer',
    fontSize: '12px',
  },
  zoomSection: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  zoomLabel: {
    color: '#9CA3AF',
    fontSize: '12px',
  },
  zoomSlider: {
    width: '100%',
    height: '6px',
    appearance: 'none',
    background: '#374151',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  },
  canvasWrapper: {
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(31, 41, 55, 0.3)',
    boxShadow: '0 0 20px rgba(49, 46, 129, 0.6)',
    border: '1px solid rgba(49, 46, 129, 0.6)',
    overflow: 'auto',
  },
  canvas: {
    display: 'block',
    borderRadius: '4px',
    cursor: 'crosshair',
  },
  toast: {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  },
}

export default EditorPanel
