import { useState, useCallback } from 'react'
import { useParticleStore } from '../store'
import type { MotionMode, ColorMode, SizeMode } from '../store'

interface ControlGroupProps {
  title: string
  groupKey: string
  children: React.ReactNode
}

function ControlGroup({ title, groupKey, children }: ControlGroupProps) {
  const expanded = useParticleStore((state) => state.uiExpandedGroups[groupKey] ?? true)
  const toggleGroup = useParticleStore((state) => state.toggleGroup)

  return (
    <div className="control-group">
      <div className="group-header" onClick={() => toggleGroup(groupKey)}>
        <span className="group-title">{title}</span>
        <span className={`group-toggle ${expanded ? 'open' : ''}`}>▼</span>
      </div>
      <div
        className="group-content"
        style={{ maxHeight: expanded ? '1000px' : '0' }}
      >
        <div className="group-content-inner">{children}</div>
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="control-item">
      <div className="control-label">
        <span>{label}</span>
        <span className="control-value">{value}{unit}</span>
      </div>
      <div className="slider-container">
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range"
          className="slider-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

export function ControlPanel() {
  const particleCount = useParticleStore((state) => state.particleCount)
  const particleSpeed = useParticleStore((state) => state.particleSpeed)
  const motionMode = useParticleStore((state) => state.motionMode)
  const startColor = useParticleStore((state) => state.startColor)
  const endColor = useParticleStore((state) => state.endColor)
  const colorMode = useParticleStore((state) => state.colorMode)
  const sizeMode = useParticleStore((state) => state.sizeMode)
  const isMobileDrawerOpen = useParticleStore((state) => state.isMobileDrawerOpen)
  const setParticleCount = useParticleStore((state) => state.setParticleCount)
  const setParticleSpeed = useParticleStore((state) => state.setParticleSpeed)
  const setMotionMode = useParticleStore((state) => state.setMotionMode)
  const setStartColor = useParticleStore((state) => state.setStartColor)
  const setEndColor = useParticleStore((state) => state.setEndColor)
  const setColorMode = useParticleStore((state) => state.setColorMode)
  const setSizeMode = useParticleStore((state) => state.setSizeMode)
  const triggerExplosion = useParticleStore((state) => state.triggerExplosion)
  const setMobileDrawerOpen = useParticleStore((state) => state.setMobileDrawerOpen)
  const setIsGravityActive = useParticleStore((state) => state.setIsGravityActive)
  const isGravityActive = useParticleStore((state) => state.isGravityActive)

  const [regenerateKey, setRegenerateKey] = useState(0)

  const handleGenerate = useCallback(() => {
    triggerExplosion()
    setRegenerateKey((k) => k + 1)
  }, [triggerExplosion])

  const motionModes: { key: MotionMode; label: string }[] = [
    { key: 'random', label: '随机漫步' },
    { key: 'vortex', label: '旋涡' },
    { key: 'gravity', label: '引力模拟' },
    { key: 'explosion', label: '爆炸散开' }
  ]

  const colorModes: { key: ColorMode; label: string }[] = [
    { key: 'linear', label: '线性渐变' },
    { key: 'sine', label: '正弦渐变' },
    { key: 'step', label: '阶梯跳变' }
  ]

  const sizeModes: { key: SizeMode; label: string }[] = [
    { key: 'constant', label: '恒定' },
    { key: 'pulse', label: '脉动' },
    { key: 'decay', label: '衰减' }
  ]

  return (
    <>
      <button
        className={`mobile-toggle-btn ${isMobileDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
      />
      <div className={`control-panel ${isMobileDrawerOpen ? 'open' : ''}`}>
        <h2 className="panel-title">星团粒子沙盒</h2>

        <ControlGroup title="粒子参数" groupKey="particles">
          <Slider
            label="粒子数量"
            value={particleCount}
            min={1000}
            max={10000}
            step={500}
            unit=" 颗"
            onChange={setParticleCount}
          />
          <Slider
            label="粒子速度"
            value={particleSpeed}
            min={0.5}
            max={2.0}
            step={0.1}
            unit=""
            onChange={setParticleSpeed}
          />
          <button className="btn" onClick={handleGenerate}>
            生成爆炸粒子
          </button>
        </ControlGroup>

        <ControlGroup title="运动模式" groupKey="motion">
          <div className="mode-buttons">
            {motionModes.map((mode) => (
              <button
                key={mode.key}
                className={`mode-btn ${motionMode === mode.key ? 'active' : ''}`}
                onClick={() => {
                  setMotionMode(mode.key)
                  if (mode.key === 'gravity') {
                    setIsGravityActive(true)
                  }
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="info-text">
            空格键复位视角 · 拖拽旋转 · 滚轮缩放
            {motionMode === 'gravity' && <br />}
            {motionMode === 'gravity' && '点击场景放置引力球'}
          </p>
        </ControlGroup>

        <ControlGroup title="颜色设置" groupKey="colors">
          <div className="color-picker-row">
            <div className="color-picker-item">
              <div className="color-picker-label">起始颜色</div>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={startColor}
                  onChange={(e) => setStartColor(e.target.value)}
                />
              </div>
            </div>
            <div className="color-picker-item">
              <div className="color-picker-label">结束颜色</div>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={endColor}
                  onChange={(e) => setEndColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="control-item" style={{ marginTop: '14px' }}>
            <div className="control-label">
              <span>渐变方式</span>
            </div>
            <div className="select-wrapper">
              <select
                className="select-input"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
              >
                {colorModes.map((mode) => (
                  <option key={mode.key} value={mode.key}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-item">
            <div className="control-label">
              <span>大小变化</span>
            </div>
            <div className="select-wrapper">
              <select
                className="select-input"
                value={sizeMode}
                onChange={(e) => setSizeMode(e.target.value as SizeMode)}
              >
                {sizeModes.map((mode) => (
                  <option key={mode.key} value={mode.key}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ControlGroup>
      </div>
    </>
  )
}
