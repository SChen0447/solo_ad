import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { StarField } from './starfield/StarField'
import { ConstellationManager, ConstellationData } from './constellation/ConstellationManager'
import ControlPanel from './controls/ControlPanel'
import { PerformanceOptimizer, QualityMode } from './optimizer/PerformanceOptimizer'

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const starFieldRef = useRef<StarField | null>(null)
  const constellationManagerRef = useRef<ConstellationManager | null>(null)
  const optimizerRef = useRef<PerformanceOptimizer | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const animationIdRef = useRef<number>(0)

  const [latitude, setLatitude] = useState<number>(30)
  const [time, setTime] = useState<number>(22)
  const [date, setDate] = useState<string>('2024-06-21')
  const [nightMode, setNightMode] = useState<boolean>(false)
  const [qualityMode, setQualityMode] = useState<QualityMode>('quality')
  const [fps, setFps] = useState<number>(60)

  const isDraggingRef = useRef<boolean>(false)
  const lastMouseXRef = useRef<number>(0)
  const lastMouseYRef = useRef<number>(0)
  const rotationVelXRef = useRef<number>(0)
  const rotationVelYRef = useRef<number>(0)
  const pitchRef = useRef<number>(-0.3)
  const yawRef = useRef<number>(0)
  const zoomRef = useRef<number>(1)
  const targetZoomRef = useRef<number>(1)
  const targetPitchRef = useRef<number>(-0.3)
  const targetYawRef = useRef<number>(0)
  const isResettingRef = useRef<boolean>(false)
  const resetStartTimeRef = useRef<number>(0)
  const resetStartPitchRef = useRef<number>(0)
  const resetStartYawRef = useRef<number>(0)
  const resetStartZoomRef = useRef<number>(1)

  const sensitivity = 0.8 * (Math.PI / 180)
  const inertia = 0.95

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    camera.position.set(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const starField = new StarField(scene)
    starFieldRef.current = starField

    const constellationManager = new ConstellationManager(scene, camera, starField)
    constellationManagerRef.current = constellationManager

    const optimizer = new PerformanceOptimizer(starField, constellationManager, {
      onMetricsUpdate: (metrics) => {
        setFps(metrics.fps)
      },
    })
    optimizerRef.current = optimizer

    const ws = new WebSocket('ws://localhost:3000')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      sendControlData(latitude, time, date)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'constellations' && constellationManagerRef.current) {
          const constellations: ConstellationData[] = data.data.constellations
          constellationManagerRef.current.setConstellations(constellations)
        }
      } catch (e) {
        console.error('WebSocket message error:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate)

      if (optimizerRef.current) {
        optimizerRef.current.onFrame(currentTime)
      }

      if (isResettingRef.current) {
        const elapsed = (currentTime - resetStartTimeRef.current) / 2000
        if (elapsed >= 1) {
          isResettingRef.current = false
          pitchRef.current = -0.3
          yawRef.current = 0
          zoomRef.current = 1
          targetPitchRef.current = -0.3
          targetYawRef.current = 0
          targetZoomRef.current = 1
        } else {
          const t = elapsed * (2 - elapsed)
          pitchRef.current = resetStartPitchRef.current + (-0.3 - resetStartPitchRef.current) * t
          yawRef.current = resetStartYawRef.current + (0 - resetStartYawRef.current) * t
          zoomRef.current = resetStartZoomRef.current + (1 - resetStartZoomRef.current) * t
        }
      } else {
        if (!isDraggingRef.current) {
          targetYawRef.current += rotationVelXRef.current
          targetPitchRef.current += rotationVelYRef.current

          rotationVelXRef.current *= inertia
          rotationVelYRef.current *= inertia

          if (Math.abs(rotationVelXRef.current) < 0.0001) rotationVelXRef.current = 0
          if (Math.abs(rotationVelYRef.current) < 0.0001) rotationVelYRef.current = 0
        }

        yawRef.current += (targetYawRef.current - yawRef.current) * 0.1
        pitchRef.current += (targetPitchRef.current - pitchRef.current) * 0.1
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.1
      }

      const maxPitch = Math.PI / 2 - 0.05
      pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current))
      targetPitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, targetPitchRef.current))

      if (cameraRef.current) {
        const cam = cameraRef.current
        const radius = 50

        cam.position.x = radius * Math.cos(pitchRef.current) * Math.sin(yawRef.current)
        cam.position.y = radius * Math.sin(pitchRef.current)
        cam.position.z = radius * Math.cos(pitchRef.current) * Math.cos(yawRef.current)

        const lookAt = new THREE.Vector3(0, 0, 0)
        cam.lookAt(lookAt)

        cam.fov = 75 / zoomRef.current
        cam.updateProjectionMatrix()
      }

      if (constellationManagerRef.current) {
        constellationManagerRef.current.update()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }

    animate(0)

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = window.innerWidth / window.innerHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)

      if (wsRef.current) {
        wsRef.current.close()
      }

      if (optimizerRef.current) {
        optimizerRef.current.dispose()
      }
      if (constellationManagerRef.current) {
        constellationManagerRef.current.dispose()
      }
      if (starFieldRef.current) {
        starFieldRef.current.dispose()
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [])

  const sendControlData = useCallback((lat: number, t: number, d: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'control',
          latitude: lat,
          time: t,
          date: d,
        })
      )
    }
  }, [])

  const sendCameraData = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && cameraRef.current) {
      const cam = cameraRef.current
      wsRef.current.send(
        JSON.stringify({
          type: 'camera',
          cameraPosition: {
            x: cam.position.x,
            y: cam.position.y,
            z: cam.position.z,
          },
          zoom: zoomRef.current,
        })
      )
    }
  }, [])

  const handleLatitudeChange = useCallback(
    (lat: number) => {
      setLatitude(lat)
      if (starFieldRef.current) {
        starFieldRef.current.setLatitude(lat)
      }
      sendControlData(lat, time, date)
    },
    [time, date, sendControlData]
  )

  const handleTimeChange = useCallback(
    (t: number) => {
      setTime(t)
      if (starFieldRef.current) {
        starFieldRef.current.setTime(t)
      }
      sendControlData(latitude, t, date)
    },
    [latitude, date, sendControlData]
  )

  const handleDateChange = useCallback(
    (d: string) => {
      setDate(d)
      if (starFieldRef.current) {
        starFieldRef.current.setDate(d)
      }
      sendControlData(latitude, time, d)
    },
    [latitude, time, sendControlData]
  )

  const handleNightModeToggle = useCallback(() => {
    setNightMode((prev) => {
      const newValue = !prev
      if (starFieldRef.current) {
        starFieldRef.current.setBackgroundBrightness(newValue ? 0.2 : 1.0)
      }
      return newValue
    })
  }, [])

  const handleQualityModeChange = useCallback((mode: QualityMode) => {
    setQualityMode(mode)
    if (optimizerRef.current) {
      optimizerRef.current.setQualityMode(mode)
    }
  }, [])

  const handleResetView = useCallback(() => {
    isResettingRef.current = true
    resetStartTimeRef.current = performance.now()
    resetStartPitchRef.current = pitchRef.current
    resetStartYawRef.current = yawRef.current
    resetStartZoomRef.current = zoomRef.current

    rotationVelXRef.current = 0
    rotationVelYRef.current = 0
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDraggingRef.current = true
      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
      rotationVelXRef.current = 0
      rotationVelYRef.current = 0
      isResettingRef.current = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (constellationManagerRef.current) {
        constellationManagerRef.current.handleMouseMove(e.clientX, e.clientY)
      }

      if (!isDraggingRef.current) return

      const deltaX = e.clientX - lastMouseXRef.current
      const deltaY = e.clientY - lastMouseYRef.current

      targetYawRef.current += deltaX * sensitivity
      targetPitchRef.current -= deltaY * sensitivity

      rotationVelXRef.current = deltaX * sensitivity
      rotationVelYRef.current = -deltaY * sensitivity

      lastMouseXRef.current = e.clientX
      lastMouseYRef.current = e.clientY
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomSpeed = 0.001
      const delta = e.deltaY * zoomSpeed

      targetZoomRef.current = Math.max(0.5, Math.min(10, targetZoomRef.current - delta))
      isResettingRef.current = false
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      <ControlPanel
        ws={wsRef.current}
        latitude={latitude}
        time={time}
        date={date}
        nightMode={nightMode}
        qualityMode={qualityMode}
        onLatitudeChange={handleLatitudeChange}
        onTimeChange={handleTimeChange}
        onDateChange={handleDateChange}
        onNightModeToggle={handleNightModeToggle}
        onQualityModeChange={handleQualityModeChange}
        onResetView={handleResetView}
        fps={fps}
      />
    </div>
  )
}

export default App
