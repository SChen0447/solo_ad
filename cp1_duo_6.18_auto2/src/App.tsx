import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneView, { type CameraSyncState } from './SceneView'
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
            <SceneView
              sceneManager={sceneManager}
              modelType={currentModel}
              materialType={currentMaterial}
              materialParams={materialParams}
              lightParams={lightParams}
              orbitRef={mainOrbitRef}
              cameraMode="source"
              cameraStateRef={cameraStateRef}
              enableMetrics={true}
              onMetricsUpdate={handleMetricsUpdate}
              metricsSamplingInterval={30}
              autoRotateSpeed={15}
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
        cameraStateRef={cameraStateRef}
      />
    </div>
  )
}

export default App
