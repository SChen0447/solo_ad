import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Building, ViewPreset, SceneData } from '@/types'
import { Scene } from './components/Scene'
import { ControlPanel } from './components/ControlPanel'
import { ShadowAnalysisPanel } from './components/ShadowAnalysisPanel'
import { useShadowAnalysis } from './components/ShadowAnalyzer'
import './App.css'

const DEFAULT_BUILDING_COLOR = '#CBD5E0'
const GRID_SIZE = 2

function App() {
  const [buildings, setBuildings] = useState<Building[]>([
    {
      id: uuidv4(),
      position: { x: -4, y: 2, z: 0 },
      size: { x: 4, y: 4, z: 4 },
      color: DEFAULT_BUILDING_COLOR,
    },
    {
      id: uuidv4(),
      position: { x: 4, y: 3, z: 2 },
      size: { x: 4, y: 6, z: 4 },
      color: DEFAULT_BUILDING_COLOR,
    },
  ])
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [date, setDate] = useState<number>(166)
  const [time, setTime] = useState<number>(14.5)
  const [viewPreset, setViewPreset] = useState<ViewPreset>('orbit')
  const [shadowMapSize, setShadowMapSize] = useState<number>(2048)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const slowFrameCountRef = useRef(0)

  useEffect(() => {
    let rafId: number
    const measurePerformance = () => {
      frameCountRef.current++
      const now = performance.now()
      const elapsed = now - lastTimeRef.current

      if (elapsed >= 1000) {
        const fps = (frameCountRef.current * 1000) / elapsed
        if (fps < 55) {
          slowFrameCountRef.current++
          if (slowFrameCountRef.current >= 3 && shadowMapSize === 2048) {
            setShadowMapSize(1024)
            console.log('[Performance] Reducing shadow map to 1024 due to low FPS')
          }
        } else {
          slowFrameCountRef.current = Math.max(0, slowFrameCountRef.current - 1)
        }
        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      rafId = requestAnimationFrame(measurePerformance)
    }
    rafId = requestAnimationFrame(measurePerformance)
    return () => cancelAnimationFrame(rafId)
  }, [shadowMapSize])

  const { currentCoverage, hourlyAnalysis } = useShadowAnalysis(buildings, date, time)

  const handleAddBuilding = useCallback((position?: { x: number; z: number }) => {
    if (buildings.length >= 10) return
    const pos = position || { x: 0, z: 0 }
    const newBuilding: Building = {
      id: uuidv4(),
      position: { x: pos.x, y: 2, z: pos.z },
      size: { x: 4, y: 4, z: 4 },
      color: DEFAULT_BUILDING_COLOR,
    }
    setBuildings(prev => [...prev, newBuilding])
    setSelectedBuildingId(newBuilding.id)
  }, [buildings.length])

  const handleUpdateBuilding = useCallback((updated: Building) => {
    setBuildings(prev =>
      prev.map(b => (b.id === updated.id ? updated : b))
    )
  }, [])

  const handleDeleteBuilding = useCallback((id: string) => {
    setBuildings(prev => prev.filter(b => b.id !== id))
    if (selectedBuildingId === id) {
      setSelectedBuildingId(null)
    }
  }, [selectedBuildingId])

  const handleImportScene = useCallback((sceneData: SceneData) => {
    if (sceneData.buildings) {
      setBuildings(sceneData.buildings)
    }
    if (sceneData.date !== undefined) {
      setDate(sceneData.date)
    }
    if (sceneData.time !== undefined) {
      setTime(sceneData.time)
    }
    setSelectedBuildingId(null)
  }, [])

  return (
    <div className="app-container">
      <div className="scene-container">
        <Scene
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          dayOfYear={date}
          hourOfDay={time}
          viewPreset={viewPreset}
          shadowMapSize={shadowMapSize}
          onSelectBuilding={setSelectedBuildingId}
          onUpdateBuilding={handleUpdateBuilding}
          onAddBuilding={handleAddBuilding}
        />
      </div>

      <ControlPanel
        buildings={buildings}
        selectedBuildingId={selectedBuildingId}
        date={date}
        time={time}
        viewPreset={viewPreset}
        onDateChange={setDate}
        onTimeChange={setTime}
        onViewPresetChange={setViewPreset}
        onAddBuilding={() => handleAddBuilding()}
        onDeleteBuilding={handleDeleteBuilding}
        onImportScene={handleImportScene}
      />

      <ShadowAnalysisPanel
        currentCoverage={currentCoverage}
        hourlyData={hourlyAnalysis.hourly}
        averageCoverage={hourlyAnalysis.averageCoverage}
        totalArea={hourlyAnalysis.totalArea}
      />
    </div>
  )
}

export default App
