import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import MaterialPanel from './MaterialPanel'
import AnalysisPanel, { CameraSyncState } from './AnalysisPanel'
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
  orbitRef: React.MutableRefObject<any>
  cameraStateRef: React.MutableRefObject<CameraSyncState | null>
  onMetricsUpdate: (metrics: Metrics) => void
}

const MainSceneContent: React.FC<MainSceneContentProps> = ({
  sceneManager,
  modelType,
  materialType,
  materialParams,
  lightParams,
  orbitRef,
  cameraStateRef,
  onMetricsUpdate,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { gl, scene, camera } = useThree()
  const rotationSpeed = (15 * Math.PI) / 180
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [modelScale, setModelScale] = useState(1)
  const [modelOffsetY, setModelOffsetY] = useState(0)
  const mountedRef = useRef(true)

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
  }, [materialType, materialParams, sceneManager])

  useEffect(() => {
    if (!meshRef.current) return
    sceneManager.updateMaterialParams(meshRef.current, materialParams)
  }, [materialParams, sceneManager])

  const lightPos = SceneManager.getLightPosition(lightParams.angleY)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }

    if (cameraStateRef && orbitRef.current) {
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

    if (onMetricsUpdate) {
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
  const cameraStateRef = useRef<CameraSyncState | null>(null)

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
              orbitRef={mainOrbitRef}
              cameraStateRef={cameraStateRef}
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
        cameraStateRef={cameraStateRef}
      />
    </div>
  )
}

export default App
