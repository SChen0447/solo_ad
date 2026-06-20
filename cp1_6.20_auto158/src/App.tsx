import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { CityBase, TrafficHeatmap, TrajectoryLine, GRID_SIZE } from './scene'
import { Tooltip, InfoPanel, PlaybackTimeline, ControlPanel } from './ui'
import { trafficData, type TrafficPoint, type RoadSegment, type HourlyData } from './trafficData'

function SceneController({ 
  onHover, 
  onClick,
  selectedRoad,
}: { 
  onHover: (flow: number | null, point: THREE.Vector2 | null) => void
  onClick: (road: RoadSegment | null) => void
  selectedRoad: RoadSegment | null
}) {
  const { raycaster, camera, gl } = useThree()
  const mouseRef = useRef(new THREE.Vector2())
  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const intersectPointRef = useRef(new THREE.Vector3())

  const roadSegments = trafficData.getRoadSegments()

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouseRef.current, camera)
    
    const intersectPoint = new THREE.Vector3()
    const hit = raycaster.ray.intersectPlane(groundPlaneRef.current, intersectPoint)
    
    if (hit && intersectPoint.x >= 0 && intersectPoint.x <= GRID_SIZE && 
        intersectPoint.z >= 0 && intersectPoint.z <= GRID_SIZE) {
      const flow = trafficData.getFlowAtPosition(intersectPoint.x, intersectPoint.z)
      intersectPointRef.current = intersectPoint
      onHover(flow, new THREE.Vector2(event.clientX, event.clientY))
    } else {
      onHover(null, null)
    }
  }, [raycaster, camera, gl, onHover])

  const handleClick = useCallback((event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouseRef.current, camera)
    
    const intersectPoint = new THREE.Vector3()
    const hit = raycaster.ray.intersectPlane(groundPlaneRef.current, intersectPoint)
    
    if (hit) {
      let closestRoad: RoadSegment | null = null
      let closestDist = Infinity

      roadSegments.forEach(road => {
        let dist: number
        if (road.isHorizontal) {
          dist = Math.abs(intersectPoint.z - road.startZ)
          if (intersectPoint.x < road.startX || intersectPoint.x > road.endX) {
            dist = Infinity
          }
        } else {
          dist = Math.abs(intersectPoint.x - road.startX)
          if (intersectPoint.z < road.startZ || intersectPoint.z > road.endZ) {
            dist = Infinity
          }
        }
        
        if (dist < closestDist && dist < 1.5) {
          closestDist = dist
          closestRoad = road
        }
      })

      onClick(closestRoad)
    }
  }, [raycaster, camera, gl, onClick, roadSegments])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [gl, handleMouseMove, handleClick])

  return null
}

function AnimatedCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(GRID_SIZE * 0.8, 25, GRID_SIZE * 1.2)
      cameraRef.current.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2)
    }
  }, [])

  const resetView = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(GRID_SIZE * 0.8, 25, GRID_SIZE * 1.2)
      controlsRef.current.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2)
      controlsRef.current.update()
    }
  }, [])

  useEffect(() => {
    ;(window as any).resetCameraView = resetView
  }, [resetView])

  return (
    <>
      <PerspectiveCamera makeDefault ref={cameraRef} position={[GRID_SIZE * 0.8, 25, GRID_SIZE * 1.2]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        target={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  )
}

function SceneContent({ 
  trafficPoints, 
  selectedRoad, 
  hourlyData,
  isPlaying,
  currentHour,
  playbackSpeed,
  onHover,
  onClick,
}: {
  trafficPoints: TrafficPoint[]
  selectedRoad: RoadSegment | null
  hourlyData: HourlyData[]
  isPlaying: boolean
  currentHour: number
  playbackSpeed: number
  onHover: (flow: number | null, point: THREE.Vector2 | null) => void
  onClick: (road: RoadSegment | null) => void
}) {
  return (
    <>
      <AnimatedCamera />
      <CityBase />
      <TrafficHeatmap data={trafficPoints} />
      <TrajectoryLine
        road={selectedRoad}
        hourlyData={hourlyData}
        isPlaying={isPlaying}
        currentHour={currentHour}
        speed={playbackSpeed}
      />
      <SceneController onHover={onHover} onClick={onClick} selectedRoad={selectedRoad} />
    </>
  )
}

export default function App() {
  const [trafficPoints, setTrafficPoints] = useState<TrafficPoint[]>([])
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [hoverFlow, setHoverFlow] = useState<number | null>(null)
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(null)
  const [infoPanelVisible, setInfoPanelVisible] = useState(false)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentHour, setCurrentHour] = useState(8)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showPlayback, setShowPlayback] = useState(false)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    const unsubscribe = trafficData.subscribe((data) => {
      setTrafficPoints(data)
    })
    trafficData.start()
    return () => {
      unsubscribe()
      trafficData.stop()
    }
  }, [])

  const handleHover = useCallback((flow: number | null, point: THREE.Vector2 | null) => {
    if (flow !== null && point !== null) {
      setHoverFlow(flow)
      setTooltipPos({ x: point.x, y: point.y })
      setTooltipVisible(true)
    } else {
      setTooltipVisible(false)
    }
  }, [])

  const handleClick = useCallback((road: RoadSegment | null) => {
    if (road) {
      setSelectedRoad(road)
      setInfoPanelVisible(true)
      setHourlyData(trafficData.getHourlyData(road.id))
    }
  }, [])

  const handleClosePanel = useCallback(() => {
    setInfoPanelVisible(false)
    setTimeout(() => {
      if (!infoPanelVisible) setSelectedRoad(null)
    }, 300)
  }, [infoPanelVisible])

  const handlePlayback = useCallback((road: RoadSegment) => {
    setShowPlayback(true)
    setIsPlaying(true)
    setCurrentHour(0)
    setHourlyData(trafficData.getHourlyData(road.id))
  }, [])

  useEffect(() => {
    if (!isPlaying || !showPlayback) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const delta = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      setCurrentHour(prev => {
        const next = prev + delta * playbackSpeed * 2
        if (next >= 24) {
          return 0
        }
        return next
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      lastTimeRef.current = 0
    }
  }, [isPlaying, showPlayback, playbackSpeed])

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleSeek = (hour: number) => setCurrentHour(hour)
  const handleSpeedChange = (speed: number) => setPlaybackSpeed(speed)
  const handleClosePlayback = () => {
    setShowPlayback(false)
    setIsPlaying(false)
  }

  const handleResetView = () => {
    if ((window as any).resetCameraView) {
      ;(window as any).resetCameraView()
    }
  }

  const congestionLevel = hoverFlow !== null 
    ? trafficData.getCongestionLevel(hoverFlow) 
    : 'low'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 40, 80]} />
        <SceneContent
          trafficPoints={trafficPoints}
          selectedRoad={showPlayback ? selectedRoad : null}
          hourlyData={hourlyData}
          isPlaying={isPlaying}
          currentHour={currentHour}
          playbackSpeed={playbackSpeed}
          onHover={handleHover}
          onClick={handleClick}
        />
      </Canvas>

      <ControlPanel onResetView={handleResetView} />

      <Tooltip
        visible={tooltipVisible && !infoPanelVisible}
        x={tooltipPos.x}
        y={tooltipPos.y}
        flow={hoverFlow}
        congestionLevel={congestionLevel}
      />

      <InfoPanel
        visible={infoPanelVisible}
        road={selectedRoad}
        hourlyData={hourlyData}
        onClose={handleClosePanel}
        onPlayback={handlePlayback}
      />

      <PlaybackTimeline
        visible={showPlayback}
        isPlaying={isPlaying}
        currentHour={currentHour}
        speed={playbackSpeed}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onClose={handleClosePlayback}
      />
    </div>
  )
}
