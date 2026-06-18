import React, { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneView, { type CameraSyncState } from './SceneView'
import type {
  Metrics,
  MaterialType,
  ModelType,
  MaterialParams,
  LightParams,
} from './SceneManager'
import { SceneManager } from './SceneManager'

interface AnalysisPanelProps {
  sceneManager: SceneManager
  modelType: ModelType
  currentMaterial: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  currentMetrics: Metrics
  onMetricsUpdate: (metrics: Metrics) => void
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
  cameraStateRef,
}) => {
  const [isLocked, setIsLocked] = useState(false)
  const [referenceState, setReferenceState] = useState<{
    material: MaterialType
    params: MaterialParams
    metrics: Metrics
  } | null>(null)
  const [fadeKey, setFadeKey] = useState(0)
  const currentOrbitRef = useRef<any>(null)
  const referenceOrbitRef = useRef<any>(null)

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
            <SceneView
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={currentMaterial}
              materialParams={materialParams}
              lightParams={lightParams}
              orbitRef={currentOrbitRef}
              cameraMode="follower"
              cameraStateRef={cameraStateRef}
              enableMetrics={true}
              onMetricsUpdate={onMetricsUpdate}
              metricsSamplingInterval={30}
              cameraInterpolationFactor={0.3}
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
            <SceneView
              sceneManager={sceneManager}
              modelType={modelType}
              materialType={refMaterial}
              materialParams={refParams}
              lightParams={lightParams}
              orbitRef={referenceOrbitRef}
              frozen={isLocked}
              cameraMode="follower"
              cameraStateRef={cameraStateRef}
              enableMetrics={false}
              metricsSamplingInterval={30}
              cameraInterpolationFactor={0.3}
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
