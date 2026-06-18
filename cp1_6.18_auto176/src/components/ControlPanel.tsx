import { useState } from 'react'
import { useAppStore } from '../store'
import { DATA_SOURCES, DataSourceType, DataLayerType, TOTAL_TIME_FRAMES } from '../types'
import '../styles/ControlPanel.css'

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
  '次年1月', '次年2月', '次年3月', '次年4月', '次年5月', '次年6月',
  '次年7月', '次年8月', '次年9月', '次年10月', '次年11月', '次年12月'
]

const LAYER_INFO: { id: DataLayerType; name: string; color: string; icon: string }[] = [
  { id: 'wind', name: '风场流线', color: '#4ade80', icon: '💨' },
  { id: 'temperature', name: '温度热力图', color: '#f87171', icon: '🌡️' },
  { id: 'pressure', name: '气压等值面', color: '#a78bfa', icon: '📊' }
]

export function ControlPanel() {
  const activeLayers = useAppStore((state) => state.activeLayers)
  const toggleLayer = useAppStore((state) => state.toggleLayer)
  const dataSource = useAppStore((state) => state.dataSource)
  const setDataSource = useAppStore((state) => state.setDataSource)
  const currentTimeFrame = useAppStore((state) => state.currentTimeFrame)
  const setCurrentTimeFrame = useAppStore((state) => state.setCurrentTimeFrame)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const setIsPlaying = useAppStore((state) => state.setIsPlaying)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const currentSourceInfo = DATA_SOURCES.find((s) => s.id === dataSource)

  const handleSourceSelect = (source: DataSourceType) => {
    setDataSource(source)
    setDropdownOpen(false)
  }

  const formatTimeFrame = (frame: number) => {
    const monthIdx = frame % 12
    const year = frame >= 12 ? '第2年' : '第1年'
    return `${year} ${MONTH_NAMES[monthIdx]}`
  }

  return (
    <div className={`control-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <button className="collapse-btn" onClick={toggleSidebar}>
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      {!sidebarCollapsed && (
        <>
          <div className="panel-header">
            <h2 className="panel-title">🌍 气候数据控制台</h2>
            <p className="panel-subtitle">Global Climate Visualizer</p>
          </div>

          <div className="panel-section">
            <div className="section-title">数据图层</div>
            <div className="layer-list">
              {LAYER_INFO.map((layer) => (
                <div
                  key={layer.id}
                  className={`layer-item ${activeLayers.includes(layer.id) ? 'active' : ''}`}
                  onClick={() => toggleLayer(layer.id)}
                >
                  <div className="layer-icon">{layer.icon}</div>
                  <div className="layer-info">
                    <div className="layer-name">{layer.name}</div>
                    <div
                      className="layer-indicator"
                      style={{ background: layer.color }}
                    />
                  </div>
                  <div className={`toggle-switch ${activeLayers.includes(layer.id) ? 'on' : ''}`}>
                    <div className="toggle-thumb">
                      {activeLayers.includes(layer.id) && <span className="check-mark">✓</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">时间控制</div>
            <div className="time-controls">
              <button
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="time-display">{formatTimeFrame(currentTimeFrame)}</div>
            </div>
            <div className="time-slider-container">
              <input
                type="range"
                min={0}
                max={TOTAL_TIME_FRAMES - 1}
                value={currentTimeFrame}
                onChange={(e) => setCurrentTimeFrame(parseInt(e.target.value))}
                className="time-slider"
              />
              <div className="time-markers">
                <span>1月</span>
                <span>12月</span>
                <span>次年12月</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">数据源</div>
            <div className="dropdown-container">
              <div
                className={`dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="dropdown-value">
                  {currentSourceInfo?.name || '选择数据源'}
                </span>
                <span className="dropdown-arrow">▼</span>
              </div>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {DATA_SOURCES.map((source) => (
                    <div
                      key={source.id}
                      className={`dropdown-item ${dataSource === source.id ? 'selected' : ''}`}
                      onClick={() => handleSourceSelect(source.id)}
                    >
                      <span className="item-name">{source.name}</span>
                      {dataSource === source.id && (
                        <span className="selected-indicator">●</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="source-description">
              {currentSourceInfo?.description}
            </p>
          </div>
        </>
      )}

      {sidebarCollapsed && (
        <div className="collapsed-icons">
          {LAYER_INFO.map((layer) => (
            <div
              key={layer.id}
              className={`icon-btn ${activeLayers.includes(layer.id) ? 'active' : ''}`}
              onClick={() => toggleLayer(layer.id)}
              title={layer.name}
            >
              {layer.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
