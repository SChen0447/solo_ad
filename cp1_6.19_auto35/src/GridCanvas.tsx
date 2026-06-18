import { useRef, useEffect, useCallback, useState } from 'react'
import { useGridStore, GRID_SIZE, LONG_PRESS_MS } from './store'
import { useWavePropagation } from './hooks'

const CELL_SIZE = 24
const GRID_LINE_COLOR = '#e0e0e0'

export function GridCanvas() {
  const gridRef = useRef<HTMLDivElement>(null)
  const baseGrid = useGridStore((s) => s.baseGrid)
  const toggleCell = useGridStore((s) => s.toggleCell)
  const propagateFrom = useGridStore((s) => s.propagateFrom)
  const updateMousePosition = useGridStore((s) => s.updateMousePosition)
  const startWave = useGridStore((s) => s.startWave)
  const endWave = useGridStore((s) => s.endWave)
  const propagationCells = useGridStore((s) => s.propagationCells)

  const [, forceUpdate] = useState(0)

  useWavePropagation(gridRef)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressCellRef = useRef<{ x: number; y: number } | null>(null)
  const isLongPressRef = useRef(false)
  const pressStartXRef = useRef(0)
  const pressStartYRef = useRef(0)

  const getCellFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((clientY - rect.top) / CELL_SIZE)
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y }
    }
    return null
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cell = getCellFromEvent(e.clientX, e.clientY)
    if (cell) {
      updateMousePosition(cell.x, cell.y)
      startWave()

      if (longPressTimerRef.current) {
        const dx = Math.abs(e.clientX - pressStartXRef.current)
        const dy = Math.abs(e.clientY - pressStartYRef.current)
        if (dx > 5 || dy > 5) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
        }
      }
    } else {
      updateMousePosition(-1, -1)
    }
  }, [getCellFromEvent, updateMousePosition, startWave])

  const handleMouseLeave = useCallback(() => {
    updateMousePosition(-1, -1)
    endWave()
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [updateMousePosition, endWave])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const cell = getCellFromEvent(e.clientX, e.clientY)
    if (!cell) return

    isLongPressRef.current = false
    longPressCellRef.current = cell
    pressStartXRef.current = e.clientX
    pressStartYRef.current = e.clientY

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (longPressCellRef.current) {
        propagateFrom(longPressCellRef.current.x, longPressCellRef.current.y)
      }
    }, LONG_PRESS_MS)
  }, [getCellFromEvent, propagateFrom])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!isLongPressRef.current) {
      const cell = getCellFromEvent(e.clientX, e.clientY)
      if (cell) {
        toggleCell(cell.x, cell.y)
      }
    }
    isLongPressRef.current = false
    longPressCellRef.current = null
  }, [getCellFromEvent, toggleCell])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const cell = getCellFromEvent(touch.clientX, touch.clientY)
    if (!cell) return

    isLongPressRef.current = false
    longPressCellRef.current = cell
    pressStartXRef.current = touch.clientX
    pressStartYRef.current = touch.clientY

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (longPressCellRef.current) {
        propagateFrom(longPressCellRef.current.x, longPressCellRef.current.y)
      }
    }, LONG_PRESS_MS)
  }, [getCellFromEvent, propagateFrom])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const cell = getCellFromEvent(touch.clientX, touch.clientY)
    if (cell) {
      updateMousePosition(cell.x, cell.y)
      startWave()
    }

    if (longPressTimerRef.current) {
      const dx = Math.abs(touch.clientX - pressStartXRef.current)
      const dy = Math.abs(touch.clientY - pressStartYRef.current)
      if (dx > 5 || dy > 5) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
      }
    }
  }, [getCellFromEvent, updateMousePosition, startWave])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!isLongPressRef.current && longPressCellRef.current) {
      toggleCell(longPressCellRef.current.x, longPressCellRef.current.y)
    }
    isLongPressRef.current = false
    longPressCellRef.current = null

    updateMousePosition(-1, -1)
    endWave()
  }, [toggleCell, updateMousePosition, endWave])

  useEffect(() => {
    if (!gridRef.current) return
    const cells = gridRef.current.querySelectorAll<HTMLSpanElement>('[data-cell]')
    const now = performance.now()
    cells.forEach((cell) => {
      const x = parseInt(cell.dataset.x || '0', 10)
      const y = parseInt(cell.dataset.y || '0', 10)
      const base = baseGrid[y][x]
      cell.dataset.base = String(base)

      const key = `${x},${y}`
      const propInfo = propagationCells.get(key)
      if (propInfo) {
        const elapsed = now - propInfo.startTime
        if (elapsed < 300) {
          cell.dataset.propStart = String(propInfo.startTime)
        }
      }

      if (base === 1) {
        cell.style.backgroundColor = '#000000'
      } else {
        cell.style.backgroundColor = '#ffffff'
      }
    })
  }, [baseGrid, propagationCells])

  const cells = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const base = baseGrid[y][x]
      cells.push(
        <span
          key={`${x}-${y}`}
          data-cell
          data-x={x}
          data-y={y}
          data-base={base}
          style={{
            backgroundColor: base === 1 ? '#000000' : '#ffffff',
            transition: 'background-color 0.2s ease',
            width: CELL_SIZE,
            height: CELL_SIZE,
            boxSizing: 'border-box',
            borderRight: `1px solid ${GRID_LINE_COLOR}`,
            borderBottom: `1px solid ${GRID_LINE_COLOR}`,
            display: 'block',
          }}
        />
      )
    }
  }

  return (
    <div
      ref={gridRef}
      id="grid-canvas"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
        backgroundColor: '#ffffff',
        borderTop: `1px solid ${GRID_LINE_COLOR}`,
        borderLeft: `1px solid ${GRID_LINE_COLOR}`,
        cursor: 'crosshair',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {cells}
    </div>
  )
}
