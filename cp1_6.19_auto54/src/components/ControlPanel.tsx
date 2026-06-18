import { useState } from 'react'
import { useDiffractionStore } from '@/store'

export function ControlPanel() {
  const {
    rotationAngle,
    tiltAngle,
    incidentAngle,
    setRotationAngle,
    setTiltAngle,
    setIncidentAngle,
  } = useDiffractionStore()

  const [collapsed, setCollapsed] = useState(false)

  const handleToggle = () => {
    setCollapsed(!collapsed)
  }

  return (
    <aside
      className={`control-panel${collapsed ? ' collapsed' : ''}`}
      onClick={collapsed ? handleToggle : undefined}
    >
      <h3>实验控制面板</h3>

      <div className="slider-group">
        <div className="slider-label">
          <span>水平旋转角</span>
          <span className="slider-value">{rotationAngle.toFixed(0)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={rotationAngle}
          onChange={(e) => setRotationAngle(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>垂直倾斜角</span>
          <span className="slider-value">{tiltAngle.toFixed(0)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={1}
          value={tiltAngle}
          onChange={(e) => setTiltAngle(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>激光入射角</span>
          <span className="slider-value">{incidentAngle.toFixed(0)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={1}
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11.5px',
          color: '#64748b',
          lineHeight: 1.7,
        }}
      >
        <div style={{ marginBottom: '6px', color: '#94a3b8', fontWeight: 600 }}>
          操作提示
        </div>
        <div>• 鼠标拖拽：旋转视角</div>
        <div>• 滚轮：缩放场景</div>
        <div>• 调节滑块：观察衍射变化</div>
      </div>
    </aside>
  )
}
