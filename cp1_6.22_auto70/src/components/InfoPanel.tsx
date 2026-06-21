import { AltitudeLevel, getAltitudeLevelName } from '../wind/WindFieldManager'

export interface SelectedPointInfo {
  latitude: number
  longitude: number
  windSpeed: number
  windDirection: number
  altitudeLevel: AltitudeLevel
}

interface InfoPanelProps {
  selectedPoint: SelectedPointInfo | null
  isVisible: boolean
}

export function InfoPanel({ selectedPoint, isVisible }: InfoPanelProps) {
  const formatLat = (lat: number): string => {
    const direction = lat >= 0 ? 'N' : 'S'
    return `${Math.abs(lat).toFixed(1)}°${direction}`
  }

  const formatLon = (lon: number): string => {
    const direction = lon >= 0 ? 'E' : 'W'
    return `${Math.abs(lon).toFixed(1)}°${direction}`
  }

  const formatDirection = (deg: number): string => {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
    const index = Math.round(deg / 45) % 8
    return directions[index]
  }

  return (
    <div
      className="info-panel"
      style={{
        position: 'fixed',
        left: '20px',
        bottom: '20px',
        backgroundColor: 'rgba(26, 32, 44, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#e2e8f0',
        fontSize: '14px',
        minWidth: '220px',
        opacity: isVisible && selectedPoint ? 1 : 0,
        transform: isVisible && selectedPoint ? 'translateX(0)' : 'translateX(-20px)',
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        pointerEvents: isVisible && selectedPoint ? 'auto' : 'none',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        测点信息
      </div>

      {selectedPoint ? (
        <>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a0aec0' }}>纬度</span>
            <span style={{ fontWeight: 500 }}>{formatLat(selectedPoint.latitude)}</span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a0aec0' }}>经度</span>
            <span style={{ fontWeight: 500 }}>{formatLon(selectedPoint.longitude)}</span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a0aec0' }}>海拔层</span>
            <span style={{ fontWeight: 500, color: '#63b3ed' }}>
              {getAltitudeLevelName(selectedPoint.altitudeLevel)}
            </span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a0aec0' }}>风速</span>
            <span style={{ fontWeight: 500, color: getWindColor(selectedPoint.windSpeed) }}>
              {selectedPoint.windSpeed.toFixed(1)} m/s
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#a0aec0' }}>风向</span>
            <span style={{ fontWeight: 500 }}>
              {formatDirection(selectedPoint.windDirection)} ({selectedPoint.windDirection.toFixed(0)}°)
            </span>
          </div>
        </>
      ) : (
        <div style={{ color: '#718096' }}>点击地球表面查看详细信息</div>
      )}
    </div>
  )
}

function getWindColor(speed: number): string {
  if (speed < 20) return '#48bb78'
  if (speed < 50) return '#ed8936'
  return '#e53e3e'
}
