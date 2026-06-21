import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  createInitialQuantumState,
  moveProbabilityWave,
  collapseWaveFunction,
  checkWinCondition,
  findStartPosition,
  findEntangledPairs,
  applyTerrainEffects,
} from './QuantumEngine'
import { LevelData, QuantumState, Direction, Position, TileType } from '@/types'

interface GameCanvasProps {
  level: LevelData
  onWin: (stats: { steps: number; observations: number; time: number }) => void
  onBack: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

const TILE_SIZE = 40
const MINIMAP_SIZE = 150

const TILE_COLORS: Record<TileType, string> = {
  path: '#4B5563',
  wall: '#1F2937',
  entangled: '#F59E0B',
  trap: '#EF4444',
  observer: '#10B981',
  start: '#3B82F6',
  exit: '#8B5CF6',
}

const GameCanvas: React.FC<GameCanvasProps> = ({ level, onWin, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [quantumState, setQuantumState] = useState<QuantumState | null>(null)
  const [steps, setSteps] = useState(0)
  const [observations, setObservations] = useState(0)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [collapsedPos, setCollapsedPos] = useState<Position | null>(null)

  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playCollapseSound = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  }, [])

  const spawnCollapseParticles = useCallback((targetX: number, targetY: number) => {
    const particles: Particle[] = []
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30
      const speed = 2 + Math.random() * 3
      particles.push({
        x: targetX + (Math.random() - 0.5) * 20,
        y: targetY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.3,
        color: '#60A5FA',
      })
    }
    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const startPos = findStartPosition(level.grid)
    if (startPos) {
      const state = createInitialQuantumState(startPos, level.width, level.height)
      setQuantumState(state)
    }
  }, [level])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quantumState || isCollapsing) return

      let direction: Direction | null = null

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right'
          break
        case ' ':
          e.preventDefault()
          handleObserve()
          return
      }

      if (direction) {
        e.preventDefault()
        handleMove(direction)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quantumState, isCollapsing])

  const handleMove = useCallback(
    (direction: Direction) => {
      if (!quantumState || isCollapsing) return

      const entangledPairs = findEntangledPairs(level.grid)
      let newState = moveProbabilityWave(quantumState, direction, level.grid)
      newState = applyTerrainEffects(newState, level.grid, entangledPairs)

      setQuantumState(newState)
      setSteps(s => s + 1)
    },
    [quantumState, level, isCollapsing]
  )

  const handleObserve = useCallback(() => {
    if (!quantumState || isCollapsing) return

    const result = collapseWaveFunction(quantumState)
    setIsCollapsing(true)
    setCollapsedPos(result.position)
    setObservations(o => o + 1)

    const canvas = canvasRef.current
    if (canvas) {
      const pixelX = result.position.x * TILE_SIZE + TILE_SIZE / 2
      const pixelY = result.position.y * TILE_SIZE + TILE_SIZE / 2
      spawnCollapseParticles(pixelX, pixelY)
    }

    playCollapseSound()

    setTimeout(() => {
      setQuantumState(result.state)
      setIsCollapsing(false)

      if (checkWinCondition(result.position, level.grid)) {
        const time = (Date.now() - startTime) / 1000
        onWin({ steps: steps + 1, observations: observations + 1, time })
      }
    }, 300)
  }, [quantumState, isCollapsing, level, steps, observations, startTime, onWin, playCollapseSound, spawnCollapseParticles])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !quantumState) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      timeRef.current += 1 / 60

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0B0E17'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          const tile = level.grid[y][x]
          const px = x * TILE_SIZE
          const py = y * TILE_SIZE

          let color = TILE_COLORS[tile]
          let alpha = 1

          if (tile === 'entangled' || tile === 'trap' || tile === 'observer') {
            const blinkFreq = tile === 'entangled' ? 2 : tile === 'trap' ? 1.5 : 1
            alpha = 0.6 + 0.4 * Math.abs(Math.sin(timeRef.current * blinkFreq * Math.PI))
          }

          ctx.fillStyle = color
          ctx.globalAlpha = alpha
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2)
          ctx.globalAlpha = 1

          ctx.strokeStyle = '#374151'
          ctx.lineWidth = 1
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE)

          if (tile === 'start') {
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('S', px + TILE_SIZE / 2, py + TILE_SIZE / 2)
          }
          if (tile === 'exit') {
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('E', px + TILE_SIZE / 2, py + TILE_SIZE / 2)
          }
        }
      }

      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          const prob = quantumState.probabilityGrid[y][x]
          if (prob > 0.01) {
            const px = x * TILE_SIZE + TILE_SIZE / 2
            const py = y * TILE_SIZE + TILE_SIZE / 2
            const radius = TILE_SIZE * 0.8

            const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius)

            const alpha = Math.min(1, prob * 3)
            const r = Math.floor(30 + prob * 200)
            const g = Math.floor(52 + prob * 100)
            const b = Math.floor(138 + prob * 117)

            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`)
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`)
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(px, py, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      if (collapsedPos && quantumState.collapsed) {
        const px = collapsedPos.x * TILE_SIZE + TILE_SIZE / 2
        const py = collapsedPos.y * TILE_SIZE + TILE_SIZE / 2

        ctx.fillStyle = '#3B82F6'
        ctx.beginPath()
        ctx.arc(px, py, TILE_SIZE * 0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#93C5FD'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= 1 / 180
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.95
        p.vy *= 0.95

        if (p.life > 0) {
          ctx.fillStyle = p.color
          ctx.globalAlpha = p.life
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          return true
        }
        return false
      })

      animationRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [quantumState, level, collapsedPos])

  useEffect(() => {
    const minimap = minimapRef.current
    if (!minimap || !quantumState) return

    const ctx = minimap.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

    const cellSize = MINIMAP_SIZE / level.width

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.grid[y][x]
        if (tile !== 'wall') {
          ctx.fillStyle = tile === 'start' ? '#3B82F6' : tile === 'exit' ? '#8B5CF6' : '#4B5563'
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 0.5, cellSize - 0.5)
        }

        const prob = quantumState.probabilityGrid[y][x]
        if (prob > 0.01) {
          const brightness = Math.floor(100 + prob * 155)
          ctx.fillStyle = `rgba(96, 165, 250, ${Math.min(1, prob * 2)})`
          ctx.beginPath()
          ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [quantumState, level])

  const canvasWidth = level.width * TILE_SIZE
  const canvasHeight = level.height * TILE_SIZE

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ← 返回菜单
        </button>
        <h2 style={styles.levelTitle}>{level.name}</h2>
        <div style={styles.stats}>
          <span style={styles.statItem}>步数: {steps}</span>
          <span style={styles.statItem}>观测: {observations}</span>
          <span style={styles.statItem}>时间: {formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div style={styles.gameArea}>
        <div style={{ ...styles.canvasWrapper, width: canvasWidth + 24, height: canvasHeight + 24 }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={styles.canvas}
          />
          <div style={{ ...styles.minimap, width: MINIMAP_SIZE, height: MINIMAP_SIZE }}>
            <canvas
              ref={minimapRef}
              width={MINIMAP_SIZE}
              height={MINIMAP_SIZE}
              style={styles.minimapCanvas}
            />
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <p style={styles.controlHint}>方向键/WASD 移动概率波 | 空格键 观测坍缩</p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    width: '100%',
    maxWidth: '800px',
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
    transition: 'all 0.15s ease',
  },
  levelTitle: {
    color: '#E5E7EB',
    fontSize: '20px',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    color: '#9CA3AF',
    fontSize: '14px',
    background: 'rgba(31, 41, 55, 0.6)',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  gameArea: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  canvasWrapper: {
    position: 'relative',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(31, 41, 55, 0.3)',
    boxShadow: '0 0 20px rgba(49, 46, 129, 0.6)',
    border: '1px solid rgba(49, 46, 129, 0.6)',
  },
  canvas: {
    display: 'block',
    borderRadius: '4px',
  },
  minimap: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    backdropFilter: 'blur(4px)',
  },
  minimapCanvas: {
    display: 'block',
  },
  controls: {
    color: '#6B7280',
    fontSize: '14px',
  },
  controlHint: {
    margin: 0,
  },
}

export default GameCanvas
