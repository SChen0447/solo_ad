import React, { useState, useRef, useEffect } from 'react'
import type { MaterialType, ModelType, MaterialParams, LightParams } from './SceneManager'
import { materialLabels, modelLabels } from './SceneManager'

interface MaterialPanelProps {
  currentModel: ModelType
  currentMaterial: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  onModelChange: (model: ModelType) => void
  onMaterialChange: (material: MaterialType) => void
  onMaterialParamsChange: (params: MaterialParams) => void
  onLightParamsChange: (params: LightParams) => void
}

const MaterialPanel: React.FC<MaterialPanelProps> = ({
  currentModel,
  currentMaterial,
  materialParams,
  lightParams,
  onModelChange,
  onMaterialChange,
  onMaterialParamsChange,
  onLightParamsChange,
}) => {
  const [materialOpen, setMaterialOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const materialTimeoutRef = useRef<number | null>(null)
  const modelTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (materialTimeoutRef.current) clearTimeout(materialTimeoutRef.current)
      if (modelTimeoutRef.current) clearTimeout(modelTimeoutRef.current)
    }
  }, [])

  const materialOptions: MaterialType[] = ['wood', 'marble', 'brushedMetal', 'carbonFiber', 'redFabric']
  const modelOptions: ModelType[] = ['vase', 'teapot', 'torusKnot']

  const handleMetalnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    onMaterialParamsChange({ ...materialParams, metalness: value })
  }

  const handleRoughnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    onMaterialParamsChange({ ...materialParams, roughness: value })
  }

  const handleLightAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    onLightParamsChange({ angleY: value })
  }

  return (
    <aside className="control-panel">
      <h2 className="panel-title">材质控制面板</h2>

      <div className="section">
        <label className="section-label">三维模型</label>
        <div className="model-select">
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value as ModelType)}
            onFocus={() => {
              if (modelTimeoutRef.current) clearTimeout(modelTimeoutRef.current)
              setModelOpen(true)
            }}
            onBlur={() => {
              modelTimeoutRef.current = window.setTimeout(() => setModelOpen(false), 200)
            }}
            style={modelOpen ? { maxHeight: '300px' } : undefined}
          >
            {modelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {modelLabels[opt]}
              </option>
            ))}
          </select>
          <span className="select-arrow">▼</span>
        </div>
      </div>

      <div className="section">
        <label className="section-label">材质纹理</label>
        <div className="material-select">
          <select
            value={currentMaterial}
            onChange={(e) => onMaterialChange(e.target.value as MaterialType)}
            onFocus={() => {
              if (materialTimeoutRef.current) clearTimeout(materialTimeoutRef.current)
              setMaterialOpen(true)
            }}
            onBlur={() => {
              materialTimeoutRef.current = window.setTimeout(() => setMaterialOpen(false), 200)
            }}
            style={materialOpen ? { maxHeight: '300px' } : undefined}
          >
            {materialOptions.map((opt) => (
              <option key={opt} value={opt}>
                {materialLabels[opt]}
              </option>
            ))}
          </select>
          <span className="select-arrow">▼</span>
        </div>
      </div>

      <div className="section">
        <label className="section-label">材质参数</label>

        <div className="slider-control">
          <div className="slider-header">
            <span className="slider-label">金属度</span>
            <span className="slider-value">{materialParams.metalness.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={materialParams.metalness}
            onChange={handleMetalnessChange}
          />
        </div>

        <div className="slider-control">
          <div className="slider-header">
            <span className="slider-label">粗糙度</span>
            <span className="slider-value">{materialParams.roughness.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={materialParams.roughness}
            onChange={handleRoughnessChange}
          />
        </div>
      </div>

      <div className="section">
        <label className="section-label">光照设置</label>
        <div className="slider-control">
          <div className="slider-header">
            <span className="slider-label">光源角度（Y轴）</span>
            <span className="slider-value">{Math.round(lightParams.angleY)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={lightParams.angleY}
            onChange={handleLightAngleChange}
          />
        </div>
      </div>
    </aside>
  )
}

export default MaterialPanel
