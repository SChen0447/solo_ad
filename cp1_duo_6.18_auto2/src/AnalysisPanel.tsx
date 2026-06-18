import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import type {
  Metrics,
  MaterialType,
  ModelType,
  MaterialParams,
  LightParams,
} from './SceneManager'
import { SceneManager } from './SceneManager'

export interface CameraSyncState {
  position: THREE.Vector3
  target: THREE.Vector3
}

interface SyncableSceneContentProps {
  sceneManager: SceneManager
  modelType: ModelType
  materialType: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  frozen?: boolean
  onMetricsUpdate?: (metrics: Metrics) => void
  cameraStateRef?: React.MutableRefObject<CameraSyncState | null>
  isCameraSource?: boolean
  orbitRef: React.MutableRefObject<any>
  autoRotateSpeed?: number
}

const SyncableSceneContent: React.FC<SyncableSceneContentProps> = ({
  sceneManager,
  modelType,
  materialType,
  materialParams,
  lightParams,
  frozen = false,
  onMetricsUpdate,
  cameraStateRef,
  isCameraSource = false,
  orbitRef,
  autoRotateSpeed = 15,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { gl, scene, camera } = useThree()
  const rotationSpeed = (autoRotateSpeed * Math.PI) / 180
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [modelScale, setModelScale] = useState(1)
  const [modelOffsetY, setModelOffsetY] = useState(0)
  const mountedRef = useRef(true)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const loadGeo = async () => {
      const result = await sceneManager.createModel(modelType)
      if (cancelled || !mountedRef.current) return
      setGeometry(result.geometry)
      setModelScale(result.scale)
      setModelOffsetY(result.positionY)
    }
    loadGeo()

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [modelType, sceneManager])

  useEffect(() => {
    if (!meshRef.current) return
    sceneManager.updateMaterial(meshRef.current, materialType, materialParams)
    const m = meshRef.current.material as THREE.MeshStandardMaterial
    materialRef.current = m
  }, [materialType, sceneManager])

  useEffect(() => {
    if (!meshRef.current) return
    sceneManager.updateMaterialParams(meshRef.current, materialParams)
  }, [materialParams, sceneManager])

  const lightPos = SceneManager.getLightPosition(lightParams.angleY)

  useFrame((_, delta) => {
    if (!frozen && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }

    if (isCameraSource && cameraStateRef && orbitRef.current) {
      const ctrl = orbitRef.current
      if (ctrl.object && ctrl.target) {
        if (!cameraStateRef.current) {
          cameraStateRef.current = {
            position: new THREE.Vector3(),
            target: new THREE.Vector3(),
          }
        }
        cameraStateRef.current.position.copy(ctrl.object.position)
        cameraStateRef.current.target.copy(ctrl.target)
      }
    }

    if (!isCameraSource && cameraStateRef && cameraStateRef.current && orbitRef.current) {
      const ctrl = orbitRef.current
      if (ctrl.object && ctrl.target) {
        ctrl.object.position.copy(cameraStateRef.current.position)
        ctrl.target.copy(cameraStateRef.current.target)
        ctrl.update()
      }
    }

    if (onMetricsUpdate && !frozen) {
      const metrics = sceneManager.computeMetricsPerFrame(
        gl,
        scene,
        camera,
        materialParams
      )
      onMetricsUpdate(metrics)
    }
  })

  if (!geometry) {
    return null
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[lightPos.x, lightPos.y, lightPos.z]}
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

      <mesh
        ref={meshRef}
        geometry={geometry}
        scale={modelScale}
        position={[0, modelOffsetY, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial attach="material" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial attach="material" opacity={0.35} />
      </mesh>

      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={8}
        enablePan={false}
        enableRotate={!frozen || isCameraSource}
        enableZoom={!frozen || isCameraSource}
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
  cameraStateRef: React.MutableRefObject<CameraSyncState | null>
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
  cameraStateRef,
}) => {
  const [isLocked, setIsLocked] = useState(false)
  const [referenceState, setReferenceState] = useState<{
    material: MaterialType
    params: MaterialParams
    metrics: Metrics
  } | null>(null)
  const [fadeKey, setFadeKey] = useState(0)
  const compareOrbitRef = useRef<any>(null)

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

  const refMaterial = isLocked && referenceState ? referenceState.material : currentMaterial
  const refParams = isLocked && referenceState ? referenceState.params : materialParams
  const refMetrics = isLocked && referenceState ? referenceState.metrics : currentMetrics

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
            <SyncableSceneContent
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={currentMaterial}
              materialParams={materialParams}
              lightParams={lightParams}
              onMetricsUpdate={onMetricsUpdate}
              cameraStateRef={cameraStateRef}
              isCameraSource={true}
              orbitRef={mainOrbitRef}
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
              <span className="metric-value">{refMetrics.brightness}</span>
            </div>
            <div className="metric metric-glossiness">
              <span className="metric-label">光泽</span>
              <span className="metric-value">{refMetrics.glossiness}%</span>
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
            <SyncableSceneContent
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={refMaterial}
              materialParams={refParams}
              lightParams={lightParams}
              frozen={isLocked}
              cameraStateRef={cameraStateRef}
              isCameraSource={false}
              orbitRef={compareOrbitRef}
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
