import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import BuildingGrid from './components/BuildingGrid'
import SunController from './components/SunController'
import ShadowMap from './components/ShadowMap'

interface SunState {
  azimuth: number
  elevation: number
  isPlaying: boolean
}

interface BuildingSettings {
  density: number
  heightVariation: number
}

const CAMERA_INITIAL_POSITION = [20, 15, 20] as const

function SceneContent({
  sunState,
  buildingSettings,
  controlsRef
}: {
  sunState: SunState
  buildingSettings: BuildingSettings
  controlsRef: React.RefObject<any>
}) {
  const { scene } = useThree()
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)

  const getSkyColor = useCallback((elevation: number): THREE.Color => {
    if (elevation >= 20) {
      return new THREE.Color('#87CEEB')
    } else if (elevation >= 10) {
      const t = (20 - elevation) / 10
      return new THREE.Color('#87CEEB').lerp(new THREE.Color('#000033'), t)
    } else if (elevation >= 5) {
      const t = (10 - elevation) / 5
      return new THREE.Color('#000033').lerp(new THREE.Color('#4B0082'), t)
    } else {
      return new THREE.Color('#4B0082')
    }
  }, [])

  const getSunColor = useCallback((elevation: number): THREE.Color => {
    if (elevation >= 20) {
      return new THREE.Color('#FFD700')
    } else if (elevation >= 5) {
      const t = (20 - elevation) / 15
      return new THREE.Color('#FFD700').lerp(new THREE.Color('#FF6347'), t)
    } else {
      return new THREE.Color('#FF6347')
    }
  }, [])

  const getAmbientIntensity = useCallback((elevation: number): number => {
    if (elevation >= 20) {
      return 0.4
    } else if (elevation >= 5) {
      return 0.4 - ((20 - elevation) / 15) * 0.3
    } else {
      return 0.1
    }
  }, [])

  const getSunPosition = useCallback((azimuth: number, elevation: number): [number, number, number] => {
    const azimuthRad = (azimuth * Math.PI) / 180
    const elevationRad = (elevation * Math.PI) / 180
    const distance = 50
    const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad)
    const y = distance * Math.sin(elevationRad)
    const z = distance * Math.cos(elevationRad) * Math.cos(azimuthRad)
    return [x, y, z]
  }, [])

  useEffect(() => {
    const skyColor = getSkyColor(sunState.elevation)
    scene.background = skyColor
  }, [sunState.elevation, scene, getSkyColor])

  useFrame(() => {
    if (directionalLightRef.current && ambientLightRef.current) {
      const [x, y, z] = getSunPosition(sunState.azimuth, sunState.elevation)
      directionalLightRef.current.position.set(x, y, z)
      directionalLightRef.current.color = getSunColor(sunState.elevation)
      directionalLightRef.current.intensity = Math.max(0.1, sunState.elevation / 20)
      ambientLightRef.current.intensity = getAmbientIntensity(sunState.elevation)
    }
  })

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.4} />
      <directionalLight
        ref={directionalLightRef}
        position={getSunPosition(sunState.azimuth, sunState.elevation)}
        intensity={1}
        castShadow
      />
      <ShadowMap lightRef={directionalLightRef} />
      <BuildingGrid
        density={buildingSettings.density}
        heightVariation={buildingSettings.heightVariation}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2F4F4F" />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={40}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

function formatTime(elevation: number): string {
  const minElevation = 5
  const maxElevation = 20
  const clampedElevation = Math.max(minElevation, Math.min(maxElevation, elevation))
  const totalMinutes = 150
  const progress = (maxElevation - clampedElevation) / (maxElevation - minElevation)
  const minutes = Math.round(progress * totalMinutes)
  const hours = 17 + Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export default function App() {
  const [sunState, setSunState] = useState<SunState>({
    azimuth: 45,
    elevation: 20,
    isPlaying: false
  })
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings>({
    density: 5,
    heightVariation: 0.5
  })
  const controlsRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (sunState.isPlaying) {
      const animate = (time: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = time
        }
        const delta = (time - lastTimeRef.current) / 1000
        lastTimeRef.current = time

        setSunState(prev => {
          const newElevation = prev.elevation - 1.5 * delta
          if (newElevation <= 5) {
            return { ...prev, elevation: 5, isPlaying: false }
          }
          return { ...prev, elevation: newElevation }
        })

        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastTimeRef.current = 0
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [sunState.isPlaying])

  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current
      const startPosition = controls.object.position.clone()
      const startTarget = controls.target.clone()
      const endPosition = new THREE.Vector3(...CAMERA_INITIAL_POSITION)
      const endTarget = new THREE.Vector3(0, 0, 0)
      const duration = 800
      const startTime = performance.now()

      const animateCamera = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const t = Math.min(elapsed / duration, 1)
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

        controls.object.position.lerpVectors(startPosition, endPosition, easeT)
        controls.target.lerpVectors(startTarget, endTarget, easeT)
        controls.update()

        if (t < 1) {
          requestAnimationFrame(animateCamera)
        }
      }

      requestAnimationFrame(animateCamera)
    }
  }, [])

  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: CAMERA_INITIAL_POSITION, fov: 60 }}
        gl={{
          antialias: true,
          alpha: false
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <SceneContent
          sunState={sunState}
          buildingSettings={buildingSettings}
          controlsRef={controlsRef}
        />
      </Canvas>

      <div className="info-panel">
        <div className="info-item">
          <span className="info-label">方位角:</span>
          <span className="info-value">{sunState.azimuth.toFixed(1)}°</span>
        </div>
        <div className="info-item">
          <span className="info-label">高度角:</span>
          <span className="info-value">{sunState.elevation.toFixed(1)}°</span>
        </div>
        <div className="time-display">{formatTime(sunState.elevation)}</div>
      </div>

      <SunController
        sunState={sunState}
        buildingSettings={buildingSettings}
        onSunStateChange={setSunState}
        onBuildingSettingsChange={setBuildingSettings}
        onResetCamera={handleResetCamera}
      />
    </div>
  )
}
