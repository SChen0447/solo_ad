import React, { useState, useEffect } from 'react'
import { IPresetStar, IStarParams } from '../data/starData'

interface StarControlPanelProps {
  presetStars: IPresetStar[]
  selectedStar: IPresetStar | null
  starParams: IStarParams | null
  inputParams: { mass: number; temp: number; age: number }
  onStarSelect: (star: IPresetStar) => void
  onParamsChange: (params: { mass: number; temp: number; age: number }) => void
  error: string | null
  onAutoOrbit: () => boolean
  isAutoOrbiting: boolean
}

const StarControlPanel: React.FC<StarControlPanelProps> = ({
  presetStars,
  selectedStar,
  starParams,
  inputParams,
  onStarSelect,
  onParamsChange,
  error,
  onAutoOrbit,
  isAutoOrbiting,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [animatedValues, setAnimatedValues] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (error) {
      setShowWarning(true)
      const timer = setTimeout(() => setShowWarning(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (starParams) {
      const keys = ['radius', 'temperature', 'absoluteMagnitude', 'lifespan']
      keys.forEach(key => {
        setAnimatedValues(prev => ({ ...prev, [key]: true }))
        const timer = setTimeout(() => {
          setAnimatedValues(prev => ({ ...prev, [key]: false }))
        }, 200)
        return () => clearTimeout(timer)
      })
    }
  }, [starParams])

  const handleMassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...inputParams, mass: parseFloat(e.target.value) })
  }

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...inputParams, temp: parseFloat(e.target.value) })
  }

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...inputParams, age: parseFloat(e.target.value) })
  }

  const getValueClass = (key: string) => {
    return `data-value ${animatedValues[key] ? 'value-changing' : ''}`
  }

  const panelContent = (
    <div className="panel-content">
      <h1 className="panel-title">恒星模拟器</h1>

      {showWarning && error && (
        <div className="warning-banner">
          <span className="warning-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="control-section">
        <label className="section-label">选择预设恒星</label>
        <select
          className="star-select"
          value={selectedStar?.id || ''}
          onChange={(e) => {
            const star = presetStars.find(s => s.id === e.target.value)
            if (star) onStarSelect(star)
          }}
        >
          {presetStars.map(star => (
            <option key={star.id} value={star.id}>
              {star.name}
            </option>
          ))}
        </select>
        {selectedStar && (
          <p className="star-description">{selectedStar.description}</p>
        )}
      </div>

      <div className="control-section">
        <label className="section-label">
          质量: {inputParams.mass.toFixed(2)} M☉
        </label>
        <input
          type="range"
          className="slider"
          min="0.1"
          max="50"
          step="0.1"
          value={inputParams.mass}
          onChange={handleMassChange}
        />
        <div className="slider-labels">
          <span>0.1</span>
          <span>50</span>
        </div>
      </div>

      <div className="control-section">
        <label className="section-label">
          温度: {inputParams.temp.toFixed(0)} K
        </label>
        <input
          type="range"
          className="slider"
          min="3000"
          max="50000"
          step="100"
          value={inputParams.temp}
          onChange={handleTempChange}
        />
        <div className="slider-labels">
          <span>3000</span>
          <span>50000</span>
        </div>
      </div>

      <div className="control-section">
        <label className="section-label">
          年龄: {inputParams.age.toFixed(0)} Myr
        </label>
        <input
          type="range"
          className="slider"
          min="0"
          max="10000"
          step="10"
          value={inputParams.age}
          onChange={handleAgeChange}
        />
        <div className="slider-labels">
          <span>0</span>
          <span>10000</span>
        </div>
      </div>

      <div className="control-section">
        <button
          className={`orbit-btn ${isAutoOrbiting ? 'active' : ''}`}
          onClick={onAutoOrbit}
        >
          {isAutoOrbiting ? '⏸ 暂停环绕' : '▶ 自动环绕'}
        </button>
      </div>

      {starParams && (
        <div className="data-section">
          <h2 className="section-title">物理参数</h2>

          <div className="data-card">
            <div className="data-row">
              <span className="data-label">半径</span>
              <span className={getValueClass('radius')}>
                {starParams.radius.toFixed(2)} R☉
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">表面温度</span>
              <span className={getValueClass('temperature')}>
                {starParams.temperature.toFixed(0)} K
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">绝对星等</span>
              <span className={getValueClass('absoluteMagnitude')}>
                {starParams.absoluteMagnitude.toFixed(2)}
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">光谱类型</span>
              <span className="data-value spectral-type">
                {starParams.spectralType}
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">主序寿命</span>
              <span className={getValueClass('lifespan')}>
                {starParams.lifespan.toLocaleString()} Myr
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">生命阶段</span>
              <span className="data-value life-stage">
                {starParams.lifeStage}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <aside className="control-panel">
        {panelContent}
      </aside>

      <button
        className="drawer-toggle"
        onClick={() => setIsDrawerOpen(true)}
      >
        ☰ 控制面板
      </button>

      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <aside
            className="control-panel drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="drawer-close"
              onClick={() => setIsDrawerOpen(false)}
            >
              ✕
            </button>
            {panelContent}
          </aside>
        </div>
      )}
    </>
  )
}

export default StarControlPanel
