import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Leva } from 'leva'
import { useAppStore } from './store'
import { Earth } from './components/Earth'
import { Clouds } from './components/Clouds'
import { Atmosphere } from './components/Atmosphere'
import { Stars } from './components/Stars'
import { WindField } from './components/WindField'
import { TemperatureOverlay } from './components/TemperatureOverlay'
import { PressureIsosurface } from './components/PressureIsosurface'
import { SlicePlaneVisual } from './components/SlicePlaneVisual'
import { SliceControls } from './components/SliceControls'
import { ControlPanel } from './components/ControlPanel'
import { InfoDisplay } from './components/InfoDisplay'
import {
  generateWeatherData,
  generateStreamLines,
  getDataAtLatLon,
  lerpData
} from './weatherEngine'
import {
  EARTH_RADIUS,
  TOTAL_TIME_FRAMES,
  GRID_WIDTH,
  GRID_HEIGHT
} from './types'
import './styles/App.css'

function SceneInteraction() {
  const earthRef = useRef<THREE.Mesh>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const { camera, gl } = useThree()
  const setHoverInfo = useAppStore((state) => state.setHoverInfo)
  const temperatureGrid = useAppStore((state) => state.temperatureGrid)
  const pressureGrid = useAppStore((state) => state.pressureGrid)
  const windSpeedGrid = useRef<number[][]>([])

  const setHoverInfoState = useAppStore.getState().setHoverInfo

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)

      if (earthRef.current) {
        const intersects = raycaster.current.intersectObject(earthRef.current)
        if (intersects.length > 0) {
          const point = intersects[0].point
          const normalizedPoint = point.clone().normalize()

          const lat = 90 - Math.acos(normalizedPoint.y) * (180 / Math.PI)
          const lon = Math.atan2(normalizedPoint.z, -normalizedPoint.x) * (180 / Math.PI)

          const state = useAppStore.getState()
          const data = getDataAtLatLon(
            lat,
            lon,
            state.temperatureGrid,
            state.pressureGrid,
            windSpeedGrid.current.length > 0
              ? windSpeedGrid.current
              : state.temperatureGrid
          )

          setHoverInfoState({
            lat,
            lon,
            temperature: data.temperature,
            windSpeed: data.windSpeed,
            pressure: data.pressure,
            visible: true,
            screenX: event.clientX,
            screenY: event.clientY
          })
        } else {
          setHoverInfoState({ visible: false })
        }
      }
    }

    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)

      if (earthRef.current) {
        const intersects = raycaster.current.intersectObject(earthRef.current)
        if (intersects.length > 0) {
          const point = intersects[0].point
          const normalizedPoint = point.clone().normalize()
          const lat = 90 - Math.acos(normalizedPoint.y) * (180 / Math.PI)
          const lon = Math.atan2(normalizedPoint.z, -normalizedPoint.x) * (180 / Math.PI)

          useAppStore.getState().setCamera({
            targetLat: lat,
            targetLon: lon
          })
        }
      }
    }

    gl.domElement.addEventListener('mousemove', handleMouseMove)
    gl.domElement.addEventListener('click', handleClick)

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove)
      gl.domElement.removeEventListener('click', handleClick)
    }
  }, [camera, gl, temperatureGrid, pressureGrid])

  return null
}

function SceneContent() {
  const activeLayers = useAppStore((state) => state.activeLayers)
  const streamLines = useAppStore((state) => state.streamLines)
  const temperatureGrid = useAppStore((state) => state.temperatureGrid)
  const pressureGrid = useAppStore((state) => state.pressureGrid)
  const slicePlane = useAppStore((state) => state.slicePlane)

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.2}
        castShadow
      />
      <directionalLight
        position={[-3, -1, -3]}
        intensity={0.2}
        color={0x6688cc}
      />

      <Stars />
      <Atmosphere />

      <group>
        <Earth />
        <Clouds />

        {activeLayers.includes('temperature') && (
          <TemperatureOverlay temperatureGrid={temperatureGrid} />
        )}

        {activeLayers.includes('pressure') && (
          <PressureIsosurface pressureGrid={pressureGrid} />
        )}

        {activeLayers.includes('wind') && (
          <WindField streamLines={streamLines} />
        )}

        {slicePlane.enabled && <SlicePlaneVisual />}
      </group>

      <SceneInteraction />

      <OrbitControls
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={2.5}
        maxDistance={15}
        enablePan={false}
        autoRotate={false}
      />
    </>
  )
}

function DataController() {
  const dataSource = useAppStore((state) => state.dataSource)
  const currentTimeFrame = useAppStore((state) => state.currentTimeFrame)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const setStreamLines = useAppStore((state) => state.setStreamLines)
  const setTemperatureGrid = useAppStore((state) => state.setTemperatureGrid)
  const setPressureGrid = useAppStore((state) => state.setPressureGrid)
  const setTransitionProgress = useAppStore((state) => state.setTransitionProgress)
  const setCurrentTimeFrame = useAppStore((state) => state.setCurrentTimeFrame)

  const [prevDataSource, setPrevDataSource] = useState(dataSource)
  const [prevTimeFrame, setPrevTimeFrame] = useState(currentTimeFrame)
  const transitionRef = useRef({ active: false, progress: 1, startTime: 0 })
  const lastFrameTimeRef = useRef<number>(0)

  const cachedData = useRef<Map<string, any>>(new Map())

  const getDataForKey = useCallback((source: string, frame: number) => {
    const key = `${source}-${frame}`
    if (cachedData.current.has(key)) {
      return cachedData.current.get(key)
    }
    const data = generateWeatherData(source as any, frame)
    cachedData.current.set(key, data)
    if (cachedData.current.size > 100) {
      const firstKey = cachedData.current.keys().next().value
      if (firstKey !== undefined) {
        cachedData.current.delete(firstKey)
      }
    }
    return data
  }, [])

  useEffect(() => {
    const currentData = getDataForKey(dataSource, currentTimeFrame)
    const windSpeedGrid = currentData.windSpeedGrid || currentData.temperatureGrid

    setTemperatureGrid(currentData.temperatureGrid)
    setPressureGrid(currentData.pressureGrid)

    const streamLines = generateStreamLines(
      currentData.windSpeedGrid || [],
      currentData.windDirGrid || [],
      800
    )
    setStreamLines(streamLines)

    if (prevDataSource !== dataSource) {
      transitionRef.current = { active: true, progress: 0, startTime: Date.now() }
      setPrevDataSource(dataSource)
    }

    setPrevTimeFrame(currentTimeFrame)
  }, [dataSource, currentTimeFrame, getDataForKey, setStreamLines, setTemperatureGrid, setPressureGrid, prevDataSource])

  useFrame(() => {
    if (transitionRef.current.active) {
      const elapsed = Date.now() - transitionRef.current.startTime
      const duration = 1000
      const progress = Math.min(1, elapsed / duration)
      transitionRef.current.progress = progress
      setTransitionProgress(progress)

      if (progress >= 1) {
        transitionRef.current.active = false
      }
    }

    if (isPlaying) {
      const state = useAppStore.getState()
      const now = Date.now()
      const frameDuration = 1000 / 4

      if (!lastFrameTimeRef.current || now - lastFrameTimeRef.current >= frameDuration) {
        const nextFrame = (state.currentTimeFrame + 1) % TOTAL_TIME_FRAMES
        setCurrentTimeFrame(nextFrame)
        lastFrameTimeRef.current = now
      }
    }
  })

  return null
}

export default function App() {
  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 1, 5], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(0x0a0e27)
            scene.background = new THREE.Color(0x0a0e27)
          }}
        >
          <SceneContent />
          <DataController />
        </Canvas>
      </div>

      <ControlPanel />
      <InfoDisplay />
      <SliceControls />
      <Leva
        theme={{
          colors: {
            accent1: '#3b82f6',
            accent2: '#2563eb',
            accent3: '#1d4ed8',
            highlight1: '#f1f5f9',
            highlight2: '#94a3b8',
            highlight3: '#64748b'
          },
          font: {
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
          }
        }}
        position="top-right"
      />
    </div>
  )
}
