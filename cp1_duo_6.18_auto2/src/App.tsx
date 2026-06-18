import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import MaterialPanel from './MaterialPanel'
import AnalysisPanel from './AnalysisPanel'
import type {
  MaterialType,
  ModelType,
  MaterialParams,
  LightParams,
  Metrics,
} from './SceneManager'
import { SceneManager, materialLabels } from './SceneManager'

interface MainSceneContentProps {
  sceneManager: SceneManager
  modelType: ModelType
  materialType: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  syncOrbitRef: React.MutableRefObject<any>
  onMetricsUpdate: (metrics: Metrics) => void
}

const MainSceneContent: React.FC<MainSceneContentProps> = ({
  sceneManager,
  modelType,
  materialType,
  materialParams,
  lightParams,
  syncOrbitRef,
  onMetricsUpdate,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const controlsRef = useRef<any>(null)
  const { gl, scene, camera } = useThree()
  const lastMetricsTime = useRef<number>(0)
  const rotationSpeed = (15 * Math.PI) / 180

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.dispose()
    }
    geometryRef.current = sceneManager.createModel(modelType)
    if (meshRef.current) {
      meshRef.current.geometry = geometryRef.current
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
    ;(syncOrbitRef as any).current = controlsRef.current
  }, [syncOrbitRef])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }

    const now = performance.now()
    if (now - lastMetricsTime.current > 50) {
      lastMetricsTime.current = now
      try {
        const metrics = sceneManager.computeMetrics(gl, scene, camera)
        onMetricsUpdate(metrics)
      } catch (e) {
        // silent
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

const App: React.FC = () => {
  const sceneManager = useMemo(() => new SceneManager(), [])

  const [currentModel, setCurrentModel] = useState<ModelType>('vase')
  const [currentMaterial, setCurrentMaterial] = useState<MaterialType>('wood')
  const [materialParams, setMaterialParams] = useState<MaterialParams>({
    metalness: 0.0,
    roughness: 0.5,
  })
  const [lightParams, setLightParams] = useState<LightParams>({ angleY: 45 })
  const [metrics, setMetrics] = useState<Metrics>({ brightness: 128, glossiness: 40 })

  const mainOrbitRef = useRef<any>(null)

  useEffect(() => {
    const defaults = sceneManager.getMaterialDefaults(currentMaterial)
    setMaterialParams(defaults)
  }, [currentMaterial, sceneManager])

  const handleMaterialChange = (material: MaterialType) => {
    setCurrentMaterial(material)
  }

  const handleModelChange = (model: ModelType) => {
    setCurrentModel(model)
  }

  const handleMaterialParamsChange = (params: MaterialParams) => {
    setMaterialParams(params)
  }

  const handleLightParamsChange = (params: LightParams) => {
    setLightParams(params)
  }

  const handleMetricsUpdate = (newMetrics: Metrics) => {
    setMetrics(newMetrics)
  }

  return (
    <div className="app-container">
      <MaterialPanel
        currentModel={currentModel}
        currentMaterial={currentMaterial}
        materialParams={materialParams}
        lightParams={lightParams}
        onModelChange={handleModelChange}
        onMaterialChange={handleMaterialChange}
        onMaterialParamsChange={handleMaterialParamsChange}
        onLightParamsChange={handleLightParamsChange}
      />

      <main className="main-scene">
        <div className="scene-badge">
          主场景 · {materialLabels[currentMaterial]}
        </div>
        <div className="scene-canvas">
          <Canvas
            shadows
            camera={{ position: [3, 2.5, 4], fov: 45 }}
            gl={{ antialias: true, preserveDrawingBuffer: false }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#1e1e1e']} />
            <fog attach="fog" args={['#1e1e1e', 8, 20]} />
            <MainSceneContent
              sceneManager={sceneManager}
              modelType={currentModel}
              materialType={currentMaterial}
              materialParams={materialParams}
              lightParams={lightParams}
              syncOrbitRef={mainOrbitRef}
              onMetricsUpdate={handleMetricsUpdate}
            />
          </Canvas>
        </div>
      </main>

      <AnalysisPanel
        sceneManager={sceneManager}
        modelType={currentModel}
        currentMaterial={currentMaterial}
        materialParams={materialParams}
        lightParams={lightParams}
        currentMetrics={metrics}
        onMetricsUpdate={handleMetricsUpdate}
        mainOrbitRef={mainOrbitRef}
      />
    </div>
  )
}

export default App
