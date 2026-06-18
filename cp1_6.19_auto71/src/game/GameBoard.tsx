import { useEffect, useRef, useState } from 'react'
import { useGameStore, Particle, FlashEffect } from '../store/gameStore'
import { NoteColor, NOTE_COLORS, NOTE_ORDER } from '../audio/BeatMap'

const ROWS = 8
const CELL_SIZE = 56
const CELL_GAP = 6

function GameBoard() {
  const {
    currentTime,
    highlightedColumn,
    borderColor,
    particles,
    flashEffects,
    activeBeats,
    beatMap,
    phase,
    fadeIn,
    handleColumnClick,
    handleKeyPress,
  } = useGameStore()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600)
  const boardRef = useRef<HTMLDivElement>(null)
  const columns = isMobile ? 4 : 6
  const visibleNotes: NoteColor[] = isMobile ? NOTE_ORDER.slice(0, 4) : NOTE_ORDER

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      const map: Record<string, number> = {
        a: 0, s: 1, d: 2, f: 3, g: 4, h: 5,
        A: 0, S: 1, D: 2, F: 3, G: 4, H: 5,
      }
      if (isMobile) {
        if (['a', 's', 'd', 'f', 'A', 'S', 'D', 'F'].includes(e.key)) {
          handleKeyPress(e.key)
        }
      } else {
        if (map[e.key] !== undefined) {
          handleKeyPress(e.key)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKeyPress, phase, isMobile])

  const getBeatPosition = (beatTime: number): { row: number; progress: number } | null => {
    const beatWindow = 2.0
    const lookAhead = beatWindow * 0.8

    const delta = beatTime - currentTime
    if (delta > lookAhead || delta < -0.15) return null

    const totalRange = lookAhead + 0.15
    const progress = 1 - (delta + 0.15) / totalRange
    const row = Math.floor(progress * ROWS)
    const rowProgress = (progress * ROWS) % 1

    if (row < 0 || row >= ROWS) return null
    return { row, progress: rowProgress }
  }

  const renderCell = (col: number, row: number) => {
    const note = visibleNotes[col]
    const noteColor = NOTE_COLORS[note]

    let beatAtCell: any = null
    let isActive = false
    let opacity = 0

    if (beatMap) {
      for (const beat of activeBeats) {
        if (beat.note !== note) continue
        const pos = getBeatPosition(beat.time)
        if (pos && pos.row === row) {
          beatAtCell = beat
          isActive = true
          opacity = 0.3 + pos.progress * 0.7
          break
        }
      }
    }

    const isHighlighted = highlightedColumn === col
    const isTargetRow = row === 3

    const flash = flashEffects.find(
      (f: FlashEffect) => f.column === col && f.row === row
    )
    const hasFlash = !!flash

    const cellParticles = particles.filter(
      (p: Particle) => p.column === col && p.row === row
    )

    return (
      <div
        key={`${col}-${row}`}
        className={`grid-cell ${isHighlighted && isTargetRow ? 'highlighted' : ''} ${hasFlash ? 'flash' : ''}`}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          background: isActive ? noteColor : 'rgba(255,255,255,0.25)',
          opacity: isActive ? opacity : 1,
          boxShadow: isHighlighted && isTargetRow ? `0 0 12px ${noteColor}` : 'none',
          borderColor: isHighlighted && isTargetRow ? noteColor : 'transparent',
          cursor: phase === 'playing' ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (phase === 'playing') {
            handleColumnClick(col)
          }
        }}
        data-note={note}
      >
        {cellParticles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `calc(50% + ${p.x}px)`,
              top: `calc(50% + ${p.y}px)`,
              background: p.color,
              opacity: p.life / p.maxLife,
            }}
          />
        ))}
      </div>
    )
  }

  const boardWidth = columns * CELL_SIZE + (columns - 1) * CELL_GAP + 32
  const boardHeight = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP + 32

  return (
    <div className="game-board-wrapper" style={{ opacity: fadeIn ? 0 : 1 }}>
      <div
        ref={boardRef}
        className="game-board"
        style={{
          width: boardWidth,
          height: boardHeight,
          borderColor: borderColor,
          boxShadow: `0 0 20px ${borderColor}60`,
        }}
      >
        <div
          className="grid-container"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
            gap: `${CELL_GAP}px`,
          }}
        >
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: columns }).map((__, col) => renderCell(col, row))
          )}
        </div>

        <div className="note-labels">
          {visibleNotes.map((n, i) => (
            <div
              key={n}
              className="note-label"
              style={{
                left: 16 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
                color: NOTE_COLORS[n],
              }}
            >
              {n}
            </div>
          ))}
        </div>

        <div className="key-labels">
          {['A', 'S', 'D', 'F', 'G', 'H'].slice(0, columns).map((k, i) => (
            <div
              key={k}
              className="key-label"
              style={{
                left: 16 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
              }}
            >
              {k}
            </div>
          ))}
        </div>
      </div>

      <div className="target-line" />
    </div>
  )
}

export default GameBoard
