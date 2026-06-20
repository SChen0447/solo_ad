import React, { useState } from 'react'

interface SunState {
  azimuth: number
  elevation: number
  isPlaying: boolean
}

interface BuildingSettings {
  density: number
  heightVariation: number
}

interface SunControllerProps {
  sunState: SunState
  buildingSettings: BuildingSettings
  onSunStateChange: (state: SunState) => void
  onBuildingSettingsChange: (settings: BuildingSettings) => void
  onResetCamera: () => void
}

const Slider: React.FC<{
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="control-group">
      <label>{label}</label>
      <div className="slider-container">
        <span className="slider-value">
          {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ '--value': `${percentage}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}

export default function SunController({
  sunState,
  buildingSettings,
  onSunStateChange,
  onBuildingSettingsChange,
  onResetCamera
}: SunControllerProps) {
  const [isButtonAnimating, setIsButtonAnimating] = useState(false)

  const handleTogglePlay = () => {
    setIsButtonAnimating(true)
    setTimeout(() => setIsButtonAnimating(false), 500)
    onSunStateChange({
      ...sunState,
      isPlaying: !sunState.isPlaying,
      elevation: !sunState.isPlaying && sunState.elevation <= 5 ? 20 : sunState.elevation
    })
  }

  const handleDensityChange = (value: number) => {
    onBuildingSettingsChange({
      ...buildingSettings,
      density: value
    })
  }

  const handleHeightVariationChange = (value: number) => {
    onBuildingSettingsChange({
      ...buildingSettings,
      heightVariation: value
    })
  }

  const handleAzimuthChange = (value: number) => {
    onSunStateChange({
      ...sunState,
      azimuth: value,
      isPlaying: false
    })
  }

  const handleElevationChange = (value: number) => {
    onSunStateChange({
      ...sunState,
      elevation: value,
      isPlaying: false
    })
  }

  return (
    <div className="control-panel">
      <h2>CityLight 控制面板</h2>

      <div className="section-title">建筑设置</div>
      <Slider
        label="建筑密度"
        value={buildingSettings.density}
        min={1}
        max={8}
        step={1}
        onChange={handleDensityChange}
      />
      <Slider
        label="高度分布"
        value={buildingSettings.heightVariation}
        min={0.1}
        max={1}
        step={0.1}
        onChange={handleHeightVariationChange}
      />

      <div className="section-title">光照设置</div>
      <Slider
        label="太阳方位角"
        value={sunState.azimuth}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={handleAzimuthChange}
      />
      <Slider
        label="太阳高度角"
        value={sunState.elevation}
        min={0}
        max={90}
        step={0.5}
        unit="°"
        onChange={handleElevationChange}
      />

      <div className="section-title">控制</div>
      <button
        className={`action-button ${sunState.isPlaying ? 'playing' : ''}`}
        onClick={handleTogglePlay}
        style={{
          transform: isButtonAnimating ? 'translateX(0)' : undefined
        }}
      >
        {sunState.isPlaying ? '⏸ 暂停日落' : '▶ 自动播放日落'}
      </button>
      <button
        className="action-button"
        onClick={onResetCamera}
      >
        🔄 重置视角
      </button>
    </div>
  )
}
