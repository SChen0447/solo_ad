import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { SceneController } from './SceneController'
import ControlPanel from './components/ControlPanel'
import './App.css'

interface ControlPointData {
  x: number
  y: number
  z: number
}

function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null)
  const sceneControllerRef = useRef<SceneController | null>(null)
  const animationFrameRef = useRef<number>(0)

  const [controlPoints, setControlPoints] = useState<ControlPointData[]>([
    { x: -4, y: 0, z: -2 },
    { x: -2, y: 2, z: 1 },
    { x: 2, y: -1, z: -1 },
    { x: 4, y: 1, z: 2 }
  ])
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [flashingIndex, setFlashingIndex] = useState<number | null>(null)

  const handleControlPointChange = useCallback((index: number, position: THREE.Vector3) => {
    setControlPoints(prev => {
      const newPoints = [...prev]
      newPoints[index] = {
        x: parseFloat(position.x.toFixed(3)),
        y: parseFloat(position.y.toFixed(3)),
        z: parseFloat(position.z.toFixed(3))
      }
      return newPoints
    })
    setFlashingIndex(index)
    setTimeout(() => setFlashingIndex(null), 300)
  }, [])

  const handleProgressChange = useCallback((newProgress: number) => {
    setProgress(newProgress)
  }, [])

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  useEffect(() => {
    if (!sceneContainerRef.current) return

    const controller = new SceneController({
      container: sceneContainerRef.current,
      onControlPointChange: handleControlPointChange,
      onProgressChange: handleProgressChange,
      onPlayStateChange: handlePlayStateChange
    })
    sceneControllerRef.current = controller

    const animate = () => {
      controller.update()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      controller.dispose()
    }
  }, [handleControlPointChange, handleProgressChange, handlePlayStateChange])

  const handleCoordChange = (index: number, axis: 'x' | 'y' | 'z', value: number) => {
    if (!sceneControllerRef.current) return

    const newPoints = [...controlPoints]
    newPoints[index] = { ...newPoints[index], [axis]: value }
    setControlPoints(newPoints)

    const pos = new THREE.Vector3(newPoints[index].x, newPoints[index].y, newPoints[index].z)
    sceneControllerRef.current.setControlPointPosition(index, pos)
  }

  const handlePlay = () => {
    sceneControllerRef.current?.play()
  }

  const handlePause = () => {
    sceneControllerRef.current?.pause()
  }

  const handleReset = () => {
    sceneControllerRef.current?.reset()
  }

  const handlePreset = () => {
    sceneControllerRef.current?.loadPresetPath()
    if (sceneControllerRef.current) {
      const points = sceneControllerRef.current.getControlPoints()
      setControlPoints(points.map(p => ({
        x: parseFloat(p.x.toFixed(3)),
        y: parseFloat(p.y.toFixed(3)),
        z: parseFloat(p.z.toFixed(3))
      })))
    }
  }

  const handleClear = () => {
    sceneControllerRef.current?.clearControlPoints()
    if (sceneControllerRef.current) {
      const points = sceneControllerRef.current.getControlPoints()
      setControlPoints(points.map(p => ({
        x: parseFloat(p.x.toFixed(3)),
        y: parseFloat(p.y.toFixed(3)),
        z: parseFloat(p.z.toFixed(3))
      })))
    }
  }

  const handleProgressSeek = (value: number) => {
    sceneControllerRef.current?.setProgress(value)
    setProgress(value)
  }

  const handleKeyframeChange = (index: number, value: number) => {
    sceneControllerRef.current?.setKeyframePosition(index, value)
  }

  return (
    <div className="app-container">
      <div className="scene-container" ref={sceneContainerRef} />
      <ControlPanel
        controlPoints={controlPoints}
        flashingIndex={flashingIndex}
        progress={progress}
        isPlaying={isPlaying}
        onCoordChange={handleCoordChange}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        onPreset={handlePreset}
        onClear={handleClear}
        onProgressSeek={handleProgressSeek}
        onKeyframeChange={handleKeyframeChange}
        keyframePositions={sceneControllerRef.current?.getKeyframePositions() || [0, 0.33, 0.66, 1]}
      />
    </div>
  )
}

export default App
