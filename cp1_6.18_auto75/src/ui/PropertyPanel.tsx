import { useSceneStore } from '../store/sceneStore'
import type { GeometryType } from '../types'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

const Slider = ({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderProps) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="slider-container">
        <input
          type="range"
          className="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, #4fc3f7 0%, #c44dff ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
      <span className="control-value">
        {value.toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </div>
  )
}

const geometryTypeNames: Record<GeometryType, string> = {
  box: '立方体',
  sphere: '球体',
  torus: '圆环',
  cone: '圆锥',
}

const PropertyPanel = () => {
  const selectedId = useSceneStore((s) => s.selectedId)
  const geometries = useSceneStore((s) => s.geometries)
  const updateGeometryPosition = useSceneStore((s) => s.updateGeometryPosition)
  const updateGeometryRotation = useSceneStore((s) => s.updateGeometryRotation)
  const updateGeometryScale = useSceneStore((s) => s.updateGeometryScale)
  const updateGeometryMaterial = useSceneStore((s) => s.updateGeometryMaterial)
  const removeGeometry = useSceneStore((s) => s.removeGeometry)

  const selected = geometries.find((g) => g.id === selectedId)
  const isOpen = !!selected

  return (
    <div className={`glass-panel property-panel ${isOpen ? '' : 'collapsed'}`}>
      {selected && (
        <>
          <div className="panel-section">
            <div className="panel-title">{geometryTypeNames[selected.type]}</div>
          </div>

          <div className="panel-section">
            <div className="panel-title">位置</div>
            <Slider
              label="X"
              value={selected.position.x}
              min={-5}
              max={5}
              onChange={(v) => updateGeometryPosition(selected.id, { x: v })}
            />
            <Slider
              label="Y"
              value={selected.position.y}
              min={-5}
              max={5}
              onChange={(v) => updateGeometryPosition(selected.id, { y: v })}
            />
            <Slider
              label="Z"
              value={selected.position.z}
              min={-5}
              max={5}
              onChange={(v) => updateGeometryPosition(selected.id, { z: v })}
            />
          </div>

          <div className="panel-section">
            <div className="panel-title">旋转</div>
            <Slider
              label="俯仰"
              value={selected.rotation.pitch}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => updateGeometryRotation(selected.id, { pitch: v })}
            />
            <Slider
              label="偏航"
              value={selected.rotation.yaw}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => updateGeometryRotation(selected.id, { yaw: v })}
            />
            <Slider
              label="翻滚"
              value={selected.rotation.roll}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => updateGeometryRotation(selected.id, { roll: v })}
            />
          </div>

          <div className="panel-section">
            <div className="panel-title">缩放</div>
            <Slider
              label="大小"
              value={selected.scale}
              min={0.5}
              max={2.0}
              onChange={(v) => updateGeometryScale(selected.id, v)}
            />
          </div>

          <div className="panel-section">
            <div className="panel-title">材质</div>
            <Slider
              label="金属度"
              value={selected.material.metalness}
              min={0}
              max={1}
              onChange={(v) => updateGeometryMaterial(selected.id, { metalness: v })}
            />
            <Slider
              label="粗糙度"
              value={selected.material.roughness}
              min={0}
              max={1}
              onChange={(v) => updateGeometryMaterial(selected.id, { roughness: v })}
            />
            <div className="control-row">
              <span className="control-label">颜色</span>
              <div
                className="color-picker-wrapper"
                style={{ backgroundColor: selected.material.color }}
              >
                <input
                  type="color"
                  className="color-picker"
                  value={selected.material.color}
                  onChange={(e) => updateGeometryMaterial(selected.id, { color: e.target.value })}
                />
              </div>
              <span className="control-value" style={{ textTransform: 'uppercase' }}>
                {selected.material.color}
              </span>
            </div>
          </div>

          <button className="btn btn-danger" onClick={() => removeGeometry(selected.id)}>
            删除几何体
          </button>
        </>
      )}
    </div>
  )
}

export default PropertyPanel
