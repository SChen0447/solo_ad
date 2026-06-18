import { useAppStore } from '../store'
import '../styles/InfoDisplay.css'

export function InfoDisplay() {
  const hoverInfo = useAppStore((state) => state.hoverInfo)

  if (!hoverInfo.visible) {
    return (
      <div className="info-display empty">
        <div className="info-title">📡 实时数据监测</div>
        <div className="info-hint">将鼠标悬停在地球表面查看数据</div>
      </div>
    )
  }

  return (
    <div className="info-display">
      <div className="info-title">📡 实时数据监测</div>
      <div className="info-coords">
        <span className="coord-label">位置</span>
        <span className="coord-value">
          {hoverInfo.lat.toFixed(1)}° {hoverInfo.lat >= 0 ? 'N' : 'S'},
          {hoverInfo.lon.toFixed(1)}° {hoverInfo.lon >= 0 ? 'E' : 'W'}
        </span>
      </div>
      <div className="info-item temp">
        <span className="info-icon">🌡️</span>
        <span className="info-label">温度</span>
        <span className="info-value">
          {hoverInfo.temperature.toFixed(1)}°C
        </span>
        <div className="info-bar">
          <div
            className="info-bar-fill temp-fill"
            style={{ width: `${Math.max(0, Math.min(100, (hoverInfo.temperature + 40) / 80 * 100))}%` }}
          />
        </div>
      </div>
      <div className="info-item wind">
        <span className="info-icon">💨</span>
        <span className="info-label">风速</span>
        <span className="info-value">
          {hoverInfo.windSpeed.toFixed(1)} m/s
        </span>
        <div className="info-bar">
          <div
            className="info-bar-fill wind-fill"
            style={{ width: `${Math.max(0, Math.min(100, hoverInfo.windSpeed / 30 * 100))}%` }}
          />
        </div>
      </div>
      <div className="info-item pressure">
        <span className="info-icon">📊</span>
        <span className="info-label">气压</span>
        <span className="info-value">
          {hoverInfo.pressure.toFixed(0)} hPa
        </span>
        <div className="info-bar">
          <div
            className="info-bar-fill pressure-fill"
            style={{ width: `${Math.max(0, Math.min(100, (hoverInfo.pressure - 980) / 60 * 100))}%` }}
          />
        </div>
      </div>
    </div>
  )
}
