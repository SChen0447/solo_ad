import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'
import SceneSetup from './scene/SceneSetup'
import PropertyPanel from './ui/PropertyPanel'
import LightControls from './ui/LightControls'
import { useSceneStore } from './store/sceneStore'
import { useRecorderStore } from './store/recorderStore'
import { RecordingState, GeometryType } from './types'

interface CreateMenuState {
  open: boolean
  x: number
  y: number
}

const geometryOptions: { type: GeometryType; label: string; icon: string }[] = [
  { type: 'box', label: '立方体', icon: '◼' },
  { type: 'sphere', label: '球体', icon: '●' },
  { type: 'torus', label: '圆环', icon: '◎' },
  { type: 'cone', label: '圆锥', icon: '▲' },
]

const App = () => {
  const [createMenu, setCreateMenu] = useState<CreateMenuState>({ open: false, x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const geometries = useSceneStore((s) => s.geometries)
  const selectedId = useSceneStore((s) => s.selectedId)
  const selectGeometry = useSceneStore((s) => s.selectGeometry)
  const addGeometry = useSceneStore((s) => s.addGeometry)
  const recordingState = useRecorderStore((s) => s.recordingState)
  const startRecording = useRecorderStore((s) => s.startRecording)
  const stopRecording = useRecorderStore((s) => s.stopRecording)
  const downloadVideo = useRecorderStore((s) => s.downloadVideo)

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('canvas-wrapper')) {
      const target = e.target as HTMLElement
      if (target.closest('.property-panel') || target.closest('.light-controls') ||
          target.closest('.create-menu') || target.closest('.record-button')) {
        return
      }
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    if (Math.abs(x) < 0.95 && Math.abs(y) < 0.9) {
      selectGeometry(null)
      setCreateMenu({
        open: true,
        x: e.clientX,
        y: e.clientY,
      })
    }
  }, [selectGeometry])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (createMenu.open && !target.closest('.create-menu')) {
        setCreateMenu((prev) => ({ ...prev, open: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [createMenu.open])

  const handleCreateGeometry = (type: GeometryType) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((createMenu.x - rect.left) / rect.width) * 10 - 5
    const z = ((createMenu.y - rect.top) / rect.height) * 10 - 5

    addGeometry(type, {
      x: Math.max(-4, Math.min(4, x)),
      y: 1,
      z: Math.max(-4, Math.min(4, z)),
    })
    setCreateMenu((prev) => ({ ...prev, open: false }))
  }

  const handleRecordClick = () => {
    if (recordingState === RecordingState.Recording) {
      stopRecording()
      setTimeout(() => {
        downloadVideo()
      }, 500)
    } else if (recordingState === RecordingState.Idle) {
      startRecording()
    }
  }

  const isRecording = recordingState === RecordingState.Recording

  return (
    <div
      ref={containerRef}
      className="app-container"
      onClick={handleCanvasClick}
    >
      <div className="canvas-wrapper">
        <Canvas
          shadows
          camera={{ position: [6, 5, 8], fov: 50, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          dpr={[1, 2]}
        >
          <SceneSetup />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={0.6}
              luminanceThreshold={0.4}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.6}
            />
            <SMAA />
          </EffectComposer>
        </Canvas>
      </div>

      {geometries.length === 0 && !createMenu.open && (
        <div className="empty-hint">
          <div className="empty-hint-icon">✨</div>
          <div>点击场景空白处创建几何体</div>
        </div>
      )}

      <button
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          handleRecordClick()
        }}
        title={isRecording ? '停止录制并下载' : '开始录制'}
      >
        <div className="record-button-inner" />
      </button>

      {createMenu.open && (
        <div
          className={`glass-panel create-menu ${createMenu.open ? '' : 'collapsed'}`}
          style={{
            left: Math.min(createMenu.x, window.innerWidth - 220),
            top: Math.min(createMenu.y, window.innerHeight - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="create-menu-title">创建几何体</div>
          <div className="create-menu-options">
            {geometryOptions.map((opt) => (
              <div
                key={opt.type}
                className="create-option"
                onClick={() => handleCreateGeometry(opt.type)}
              >
                <span className="create-option-icon">{opt.icon}</span>
                <span className="create-option-label">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PropertyPanel />
      <LightControls />
    </div>
  )
}

export default App
