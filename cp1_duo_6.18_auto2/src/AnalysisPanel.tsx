import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import type { Metrics, MaterialType, ModelType, MaterialParams, LightParams } from './SceneManager'
import { SceneManager } from './SceneManager'

interface SceneCanvasProps {
  sceneManager: SceneManager
  modelType: ModelType
  materialType: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  frozen?: boolean
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  onMetricsUpdate?: (metrics: Metrics) => void
  syncOrbitRef?: React.MutableRefObject<any>
  autoRotateSpeed?: number
}

const SceneContent: React.FC<{
  sceneManager: SceneManager
  modelType: ModelType
  materialType: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  frozen?: boolean
  onMetricsUpdate?: (metrics: Metrics) => void
  syncOrbitRef?: React.MutableRefObject<any>
  autoRotateSpeed?: number
}> = ({
  sceneManager,
  modelType,
  materialType,
  materialParams,
  lightParams,
  frozen = false,
  onMetricsUpdate,
  syncOrbitRef,
  autoRotateSpeed = 15,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const { gl, scene, camera } = useThree()
  const controlsRef = useRef<any>(null)
  const lastMetricsTime = useRef<number>(0)
  const rotationSpeed = (autoRotateSpeed * Math.PI) / 180

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.dispose()
    }
    geometryRef.current = sceneManager.createModel(modelType)
    if (meshRef.current) {
      meshRef.current.geometry = geometryRef.current
    }
    return () => {
      // geometry handled globally
    }
  }, [modelType, sceneManager])

  useEffect(() => {
    if (meshRef.current) {
      sceneManager.updateMaterial(meshRef.current, materialType, materialParams)
    }
  }, [materialType, sceneManager])

  useEffect(() => {
    if (meshRef.current) {
      sceneManager.updateMaterialParams(meshRef.current, materialParams)
    }
  }, [materialParams, sceneManager])

  useEffect(() => {
    sceneManager.updateLightAngle(lightParams.angleY)
  }, [lightParams.angleY, sceneManager])

  useEffect(() => {
    if (syncOrbitRef && controlsRef.current) {
      ;(syncOrbitRef as any).current = controlsRef.current
    }
  }, [syncOrbitRef])

  useFrame((_, delta) => {
    if (!frozen && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }

    if (onMetricsUpdate && !frozen) {
      const now = performance.now()
      if (now - lastMetricsTime.current > 50) {
        lastMetricsTime.current = now
        try {
          const metrics = sceneManager.computeMetrics(gl, scene, camera)
          onMetricsUpdate(metrics)
        } catch (e) {
          // skip metrics on error
        }
      }
    }
  })

  const initialGeometry = geometryRef.current || sceneManager.createModel(modelType)
  if (!geometryRef.current) geometryRef.current = initialGeometry

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[
          Math.sin((lightParams.angleY * Math.PI) / 180) * 6,
          4,
          Math.cos((lightParams.angleY * Math.PI) / 180) * 6,
        ]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />

      <mesh ref={meshRef} geometry={initialGeometry} castShadow receiveShadow>
        <meshStandardMaterial attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial attach="material" opacity={0.35} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={8}
        enablePan={false}
      />
    </>
  )
}

interface AnalysisPanelProps {
  sceneManager: SceneManager
  modelType: ModelType
  currentMaterial: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  currentMetrics: Metrics
  onMetricsUpdate: (metrics: Metrics) => void
  mainOrbitRef: React.MutableRefObject<any>
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  sceneManager,
  modelType,
  currentMaterial,
  materialParams,
  lightParams,
  currentMetrics,
  onMetricsUpdate,
  mainOrbitRef,
}) => {
  const [isLocked, setIsLocked] = useState(false)
  const [referenceState, setReferenceState] = useState<{
    material: MaterialType
    params: MaterialParams
    metrics: Metrics
  } | null>(null)
  const [fadeKey, setFadeKey] = useState(0)
  const compareOrbitRef = useRef<any>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!mainOrbitRef.current || !compareOrbitRef.current) return

    const syncControls = () => {
      if (syncingRef.current) return
      const source = mainOrbitRef.current
      const target = compareOrbitRef.current
      if (!source || !target || !source.object || !target.object) return

      syncingRef.current = true
      try {
        target.object.position.copy(source.object.position)
        target.target.copy(source.target)
        target.update()
      } finally {
        syncingRef.current = false
      }
    }

    const source = mainOrbitRef.current
    if (source) {
      source.addEventListener?.('change', syncControls)
      source.addEventListener?.('end', syncControls)
    }

    const interval = setInterval(syncControls, 100)

    return () => {
      if (source) {
        source.removeEventListener?.('change', syncControls)
        source.removeEventListener?.('end', syncControls)
      }
      clearInterval(interval)
    }
  }, [mainOrbitRef])

  const handleLockReference = () => {
    if (isLocked) {
      setIsLocked(false)
      setReferenceState(null)
    } else {
      setIsLocked(true)
      setReferenceState({
        material: currentMaterial,
        params: { ...materialParams },
        metrics: { ...currentMetrics },
      })
      setFadeKey((k) => k + 1)
    }
  }

  const displayMaterial = isLocked && referenceState ? referenceState.material : currentMaterial
  const displayParams = isLocked && referenceState ? referenceState.params : materialParams
  const displayMetrics = isLocked && referenceState ? referenceState.metrics : currentMetrics

  return (
    <section className="analysis-panel">
      <div className="view-slot">
        <div className="view-header">
          <span className="view-title">当前材质</span>
          <div className="metrics-row">
            <div className="metric metric-brightness">
              <span className="metric-label">亮度</span>
              <span className="metric-value">{currentMetrics.brightness}</span>
            </div>
            <div className="metric metric-glossiness">
              <span className="metric-label">光泽</span>
              <span className="metric-value">{currentMetrics.glossiness}%</span>
            </div>
          </div>
        </div>
        <div key={`current-${fadeKey}`} className="view-canvas-wrapper fade-in">
          <Canvas
            shadows
            camera={{ position: [3, 2.5, 4], fov: 45 }}
            gl={{ antialias: true, preserveDrawingBuffer: false }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#1e1e1e']} />
            <fog attach="fog" args={['#1e1e1e', 8, 20]} />
            <SceneContent
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={currentMaterial}
              materialParams={materialParams}
              lightParams={lightParams}
              onMetricsUpdate={onMetricsUpdate}
              syncOrbitRef={mainOrbitRef}
              autoRotateSpeed={15}
            />
          </Canvas>
        </div>
      </div>

      <div className="view-slot">
        <div className="view-header">
          <span className="view-title">
            {isLocked ? '参考基准（已锁定）' : '参考视图'}
          </span>
          <div className="metrics-row">
            <div className="metric metric-brightness">
              <span className="metric-label">亮度</span>
              <span className="metric-value">{displayMetrics.brightness}</span>
            </div>
            <div className="metric metric-glossiness">
              <span className="metric-label">光泽</span>
              <span className="metric-value">{displayMetrics.glossiness}%</span>
            </div>
          </div>
        </div>
        {isLocked && <div className="frozen-tag">已冻结</div>}
        {isLocked && <div className="frozen-overlay" />}
        <div key={`ref-${fadeKey}`} className="view-canvas-wrapper fade-in">
          <Canvas
            shadows
            camera={{ position: [3, 2.5, 4], fov: 45 }}
            gl={{ antialias: true, preserveDrawingBuffer: false }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#1e1e1e']} />
            <fog attach="fog" args={['#1e1e1e', 8, 20]} />
            <SceneContent
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={displayMaterial}
              materialParams={displayParams}
              lightParams={lightParams}
              frozen={isLocked}
              syncOrbitRef={compareOrbitRef}
              autoRotateSpeed={isLocked ? 0 : 15}
            />
          </Canvas>
        </div>
        <button
          className={`lock-btn ${isLocked ? 'locked' : ''}`}
          onClick={handleLockReference}
        >
          {isLocked ? '🔓 释放参考' : '🔒 固定为参考'}
        </button>
      </div>
    </section>
  )
}

export default AnalysisPanel
