import { useEffect, useRef, useCallback } from 'react'
import {
  useGridStore,
  GRID_SIZE,
  WAVE_RADIUS,
  WAVE_DECAY_MS,
  LONG_PRESS_MS,
  PROPAGATION_SCALE_MS,
} from './store'

function cubicBezier(t: number): number {
  const p0 = 0
  const p1 = 0.25
  const p2 = 0.46
  const p3 = 0.45
  const p4 = 0.94
  const cp1x = 0.25
  const cp1y = 0.46
  const cp2x = 0.45
  const cp2y = 0.94
  return (
    3 * cp1x * t * (1 - t) * (1 - t) +
    3 * cp2x * t * t * (1 - t) +
    t * t * t
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useWavePropagation(gridRef: React.RefObject<HTMLDivElement | null>) {
  const mouseX = useGridStore((s) => s.mouseGridX)
  const mouseY = useGridStore((s) => s.mouseGridY)
  const waveActive = useGridStore((s) => s.waveActive)
  const waveStartTimeRef = useRef(0)
  const lastMouseMoveRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const waveDecayStartRef = useRef(0)
  const isDecayingRef = useRef(false)

  const updateWaveStyles = useCallback(() => {
    if (!gridRef.current) return

    const now = performance.now()
    const cells = gridRef.current.querySelectorAll<HTMLSpanElement>('[data-cell]')

    let waveIntensity = 1
    if (isDecayingRef.current) {
      const elapsed = now - waveDecayStartRef.current
      const t = Math.min(1, elapsed / WAVE_DECAY_MS)
      const eased = easeInOutCubic(t)
      waveIntensity = 1 - eased
      if (t >= 1) {
        waveIntensity = 0
      }
    }

    const mx = mouseX
    const my = mouseY

    cells.forEach((cell) => {
      const x = parseInt(cell.dataset.x || '0', 10)
      const y = parseInt(cell.dataset.y || '0', 10)
      const baseState = parseInt(cell.dataset.base || '0', 10)

      const dx = x - mx
      const dy = y - my
      const distance = Math.sqrt(dx * dx + dy * dy)

      let finalColor: string
      let scale = 1

      if (distance <= WAVE_RADIUS && waveIntensity > 0 && mx >= 0 && my >= 0) {
        const waveFactor = 1 - distance / WAVE_RADIUS
        const waveGrayValue = Math.floor(255 * (1 - waveFactor * waveIntensity))
        const minGray = 170
        const waveColorValue = Math.floor(
          minGray + (255 - minGray) * (1 - waveFactor * waveIntensity)
        )

        if (baseState === 1) {
          const mixFactor = waveFactor * waveIntensity * 0.3
          finalColor = `rgb(${Math.floor(0 + mixFactor * 80)}, ${Math.floor(0 + mixFactor * 80)}, ${Math.floor(0 + mixFactor * 80)})`
        } else {
          const gray = Math.floor(waveColorValue)
          finalColor = `rgb(${gray}, ${gray}, ${gray})`
        }
      } else {
        finalColor = baseState === 1 ? '#000000' : '#ffffff'
      }

      const propStart = cell.dataset.propStart
      if (propStart) {
        const propTime = now - parseFloat(propStart)
        if (propTime < PROPAGATION_SCALE_MS) {
          const t = propTime / PROPAGATION_SCALE_MS
          scale = 0.8 + 0.2 * easeOutCubic(t)
        } else {
          cell.removeAttribute('data-prop-start')
        }
      }

      cell.style.backgroundColor = finalColor
      if (scale !== 1) {
        cell.style.transform = `scale(${scale})`
      } else {
        cell.style.transform = ''
      }
    })

    if (waveIntensity > 0 || !isDecayingRef.current) {
      rafRef.current = requestAnimationFrame(updateWaveStyles)
    }
  }, [mouseX, mouseY, gridRef])

  useEffect(() => {
    if (mouseX >= 0 && mouseY >= 0) {
      isDecayingRef.current = false
      waveStartTimeRef.current = performance.now()
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateWaveStyles)
      }
    } else {
      isDecayingRef.current = true
      waveDecayStartRef.current = performance.now()
    }
  }, [mouseX, mouseY, updateWaveStyles])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])
}

export function useLongPressDetect(
  x: number,
  y: number,
  onLongPress: (x: number, y: number) => void,
  onClick: (x: number, y: number) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isLongPressRef.current = false
    startXRef.current = clientX
    startYRef.current = clientY
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress(x, y)
    }, LONG_PRESS_MS)
  }, [x, y, onLongPress])

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!isLongPressRef.current) {
      onClick(x, y)
    }
  }, [x, y, onClick])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const dx = Math.abs(clientX - startXRef.current)
    const dy = Math.abs(clientY - startYRef.current)
    if (dx > 5 || dy > 5) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }, [handleStart])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove])

  return {
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleMouseMove,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
  }
}
