import { useState, useCallback, useEffect } from 'react'
import SonarScene from './modules/sonar/SonarScene'
import SidePanel from './modules/dashboard/SidePanel'
import type { TargetMarkerData } from './modules/dashboard/TargetMarker'

export interface AppState {
  currentDepth: number
  waterTemperature: number
  targets: TargetMarkerData[]
  shipPosition: { x: number; z: number }
  selectedTarget: TargetMarkerData | null
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentDepth: 15,
    waterTemperature: 7.5,
    targets: [],
    shipPosition: { x: 0, z: 0 },
    selectedTarget: null,
  })

  const updateSonarData = useCallback((depth: number, temp: number) => {
    setAppState(prev => ({
      ...prev,
      currentDepth: depth,
      waterTemperature: temp,
    }))
  }, [])

  const updateShipPosition = useCallback((x: number, z: number) => {
    setAppState(prev => ({
      ...prev,
      shipPosition: { x, z },
    }))
  }, [])

  const updateTargets = useCallback((targets: TargetMarkerData[]) => {
    setAppState(prev => ({
      ...prev,
      targets,
    }))
  }, [])

  const addTarget = useCallback((target: TargetMarkerData) => {
    setAppState(prev => ({
      ...prev,
      targets: [...prev.targets, target],
    }))
  }, [])

  const focusTarget = useCallback((target: TargetMarkerData) => {
    setAppState(prev => ({
      ...prev,
      selectedTarget: target,
    }))
  }, [])

  const clearSelectedTarget = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      selectedTarget: null,
    }))
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SonarScene
        onSonarDataUpdate={updateSonarData}
        onShipMove={updateShipPosition}
        onTargetsUpdate={updateTargets}
        onTargetAdded={addTarget}
        selectedTarget={appState.selectedTarget}
        onTargetFocusComplete={clearSelectedTarget}
      />
      <SidePanel
        currentDepth={appState.currentDepth}
        waterTemperature={appState.waterTemperature}
        targets={appState.targets}
        shipPosition={appState.shipPosition}
        onTargetClick={focusTarget}
      />
    </div>
  )
}
