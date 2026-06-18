import React, { useEffect, useRef, useCallback } from 'react'
import Scene from './render/Scene'
import TimeSlider from './controls/TimeSlider'
import InfoPanel from './controls/InfoPanel'
import { useStore } from './store'
import type { TimeSeriesData } from './types'
import {
  generateMockData,
  initProcessedCells,
  prepareTransition,
  interpolateCells
} from './data/dataManager'

const App: React.FC = () => {
  const currentTimeIndex = useStore((s) => s.currentTimeIndex)
  const isPlaying = useStore((s) => s.isPlaying)
  const processedCells = useStore((s) => s.processedCells)
  const setProcessedCells = useStore((s) => s.setProcessedCells)
  const advanceTime = useStore((s) => s.advanceTime)
  const setIsTransitioning = useStore((s) => s.setIsTransitioning)
  const isTransitioning = useStore((s) => s.isTransitioning)
  const setTransitionProgress = useStore((s) => s.setTransitionProgress)
  const totalTimePoints = useStore((s) => s.totalTimePoints)

  const dataRef = useRef<TimeSeriesData | null>(null)
  const lastTimeIndexRef = useRef(0)
  const transitionStartRef = useRef(0)
  const playIntervalRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const data = generateMockData()
    dataRef.current = data
    useStore.getState().currentTimeIndex === undefined ? null : null
    const cells = initProcessedCells(data, 0)
    setProcessedCells(cells)
    lastTimeIndexRef.current = 0
  }, [setProcessedCells])

  const startTransition = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!dataRef.current) return

      const store = useStore.getState()
      let cells = store.processedCells

      cells = prepareTransition(cells, dataRef.current, fromIndex)
      cells = prepareTransition(cells, dataRef.current, toIndex)

      const tempCells = cells.map((cell, i) => {
        const currentDensity = dataRef.current!.densities[fromIndex][i]
        const currentColorArr = (() => {
          const d = currentDensity
          if (d <= 50) {
            const t = d / 50
            return [Math.round(255 * t), 0, Math.round(255 * (1 - t))] as [number, number, number]
          } else {
            const t = (d - 50) / 50
            return [255, Math.round(255 * t), Math.round(255 * t)] as [number, number, number]
          }
        })()
        const currentHeight = (() => {
          const b = cell.buildingHeight
          const dd = Math.max(0, Math.min(100, currentDensity))
          return 0.5 + (dd / 100) * 7.5 + b
        })()
        return {
          ...cell,
          currentDensity,
          color: currentColorArr,
          heightScale: currentHeight,
          targetDensity: dataRef.current!.densities[toIndex][i],
          targetColor: (() => {
            const d = dataRef.current!.densities[toIndex][i]
            if (d <= 50) {
              const t = d / 50
              return [Math.round(255 * t), 0, Math.round(255 * (1 - t))] as [number, number, number]
            } else {
              const t = (d - 50) / 50
              return [255, Math.round(255 * t), Math.round(255 * t)] as [number, number, number]
            }
          })(),
          targetHeightScale: (() => {
            const b = cell.buildingHeight
            const dd = Math.max(0, Math.min(100, dataRef.current!.densities[toIndex][i]))
            return 0.5 + (dd / 100) * 7.5 + b
          })()
        }
      })

      setProcessedCells(tempCells)
      setIsTransitioning(true)
      setTransitionProgress(0)
      transitionStartRef.current = performance.now()

      const duration = 500
      const animate = (now: number) => {
        const elapsed = now - transitionStartRef.current
        const rawProgress = elapsed / duration
        const easedProgress = rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2

        const currentCells = useStore.getState().processedCells
        const interpolated = interpolateCells(currentCells, easedProgress)
        setProcessedCells(interpolated)
        setTransitionProgress(easedProgress)

        if (rawProgress < 1) {
          rafIdRef.current = requestAnimationFrame(animate)
        } else {
          setIsTransitioning(false)
          rafIdRef.current = null
        }
      }
      rafIdRef.current = requestAnimationFrame(animate)
    },
    [setProcessedCells, setIsTransitioning, setTransitionProgress]
  )

  useEffect(() => {
    if (lastTimeIndexRef.current !== currentTimeIndex && !isTransitioning) {
      startTransition(lastTimeIndexRef.current, currentTimeIndex)
      lastTimeIndexRef.current = currentTimeIndex
    }
  }, [currentTimeIndex, startTransition, isTransitioning])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        if (!useStore.getState().isTransitioning) {
          advanceTime()
        }
      }, 1200)
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
  }, [isPlaying, advanceTime])

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Scene cells={processedCells} />

      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 100,
          fontFamily: 'Arial',
          fontSize: 16,
          color: '#ffffff',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '4px 8px',
          borderRadius: 4,
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          fontWeight: 500,
          letterSpacing: 0.5
        }}
      >
        时间点: {currentTimeIndex + 1} / {totalTimePoints}
      </div>

      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'rgba(20, 20, 30, 0.75)',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(0, 170, 255, 0.15)',
          fontSize: 13,
          color: '#aaa',
          fontFamily: 'Arial',
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aaff" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>城市三维热力可视化</span>
        </div>
        <span style={{ opacity: 0.5 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="1" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>{processedCells.length} 个网格</span>
        </div>
        <span style={{ opacity: 0.5 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <kbd style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>WASD</kbd>
          <span>平移</span>
          <kbd style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.2)',
            marginLeft: 4
          }}>拖拽</kbd>
          <span>旋转</span>
          <kbd style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.2)',
            marginLeft: 4
          }}>滚轮</kbd>
          <span>缩放</span>
        </div>
      </div>

      <TimeSlider />
      <InfoPanel cells={processedCells} />

      <div
        style={{
          position: 'fixed',
          bottom: 90,
          left: 20,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '10px 12px',
          background: 'rgba(20, 20, 30, 0.8)',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 11,
          color: '#888',
          fontFamily: 'Arial',
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#ccc', marginBottom: 4 }}>热力图例</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 100,
              height: 10,
              borderRadius: 5,
              background: 'linear-gradient(90deg, #0000ff 0%, #ff0000 50%, #ffffff 100%)',
              boxShadow: '0 0 10px rgba(255,255,255,0.1)'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: 100, fontSize: 10, color: '#666' }}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  )
}

export default App
