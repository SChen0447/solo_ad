import { useState, useCallback } from 'react'
import Scene3D from './components/Scene3D'
import ControlPanel from './components/ControlPanel'
import './App.css'

export interface FragmentInfo {
  id: string
  name: string
  material: string
  position: { x: number; y: number; z: number }
  region: string
}

export interface Annotation {
  id: string
  content: string
  position: { x: number; y: number; z: number }
}

export type StageType = 'fragments' | 'restored' | 'complete'

function App() {
  const [currentStage, setCurrentStage] = useState<StageType>('complete')
  const [selectedFragment, setSelectedFragment] = useState<FragmentInfo | null>(null)
  const [overlayMode, setOverlayMode] = useState(false)
  const [transparency, setTransparency] = useState({
    fragments: 50,
    restored: 50,
    complete: 50
  })
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  const handleStageChange = useCallback((stage: StageType) => {
    setCurrentStage(stage)
    setSelectedFragment(null)
  }, [])

  const handleFragmentSelect = useCallback((fragment: FragmentInfo | null) => {
    setSelectedFragment(fragment)
  }, [])

  const handleOverlayToggle = useCallback(() => {
    setOverlayMode(prev => !prev)
  }, [])

  const handleTransparencyChange = useCallback((key: keyof typeof transparency, value: number) => {
    setTransparency(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleAddAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation])
  }, [])

  const handleClearAnnotations = useCallback(() => {
    setAnnotations([])
  }, [])

  const handleExportAnnotations = useCallback(() => {
    const dataStr = JSON.stringify(annotations, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'annotations.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [annotations])

  return (
    <div className="app-container">
      <div className="scene-wrapper">
        <Scene3D
          currentStage={currentStage}
          selectedFragmentId={selectedFragment?.id || null}
          onFragmentSelect={handleFragmentSelect}
          overlayMode={overlayMode}
          transparency={transparency}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
        />
      </div>
      <ControlPanel
        currentStage={currentStage}
        onStageChange={handleStageChange}
        selectedFragment={selectedFragment}
        overlayMode={overlayMode}
        onOverlayToggle={handleOverlayToggle}
        transparency={transparency}
        onTransparencyChange={handleTransparencyChange}
        onClearAnnotations={handleClearAnnotations}
        onExportAnnotations={handleExportAnnotations}
        annotationCount={annotations.length}
      />
    </div>
  )
}

export default App
