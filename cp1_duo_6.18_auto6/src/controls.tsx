import { useState, useEffect, useCallback } from 'react'
import { useWeatherStore, ParticleType } from './store'

const particleOptions: { value: ParticleType; label: string; icon: string }[] = [
  { value: 'wind', label: '风', icon: '💨' },
  { value: 'rain', label: '雨', icon: '🌧️' },
  { value: 'snow', label: '雪', icon: '❄️' },
  { value: 'wind+rain', label: '风+雨', icon: '🌬️🌧️' },
]

export default function Controls() {
  const particleType = useWeatherStore((s) => s.particleType)
  const density = useWeatherStore((s) => s.density)
  const speed = useWeatherStore((s) => s.speed)
  const windDirection = useWeatherStore((s) => s.windDirection)
  const setParticleType = useWeatherStore((s) => s.setParticleType)
  const setDensity = useWeatherStore((s) => s.setDensity)
  const setSpeed = useWeatherStore((s) => s.setSpeed)
  const setWindDirection = useWeatherStore((s) => s.setWindDirection)
  const cycleWeather = useWeatherStore((s) => s.cycleWeather)

  const [isMobile, setIsMobile] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isPressed, setIsPressed] = useState<string | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleButtonPress = useCallback((id: string, action: () => void) => {
    setIsPressed(id)
    action()
    setTimeout(() => setIsPressed(null), 200)
  }, [])

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  }

  const thumbStyle = `
    .control-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: transform 0.15s ease;
    }
    .control-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    .control-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  `

  const panelContent = (
    <div style={{ padding: '16px 20px' }}>
      <style>{thumbStyle}</style>
      <h2 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '20px',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>🌤️</span> 气象控制面板
      </h2>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: '8px',
          display: 'block',
        }}>
          粒子类型
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}>
          {particleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleButtonPress(`type-${opt.value}`, () => setParticleType(opt.value))}
              style={{
                padding: '10px 8px',
                fontSize: '13px',
                fontFamily: 'system-ui',
                borderRadius: '8px',
                border: particleType === opt.value
                  ? '1px solid rgba(255,255,255,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: particleType === opt.value
                  ? 'rgba(100, 150, 255, 0.25)'
                  : 'rgba(51,51,51,0.6)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isPressed === `type-${opt.value}` ? 'scale(0.95)' : 'scale(1)',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => {
                if (particleType !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(80,80,80,0.7)'
                }
              }}
              onMouseLeave={(e) => {
                if (particleType !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(51,51,51,0.6)'
                }
              }}
            >
              <span style={{ marginRight: '4px' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <label style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.85)',
          }}>
            密度
          </label>
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'system-ui',
          }}>
            {density}%
          </span>
        </div>
        <input
          type="range"
          className="control-slider"
          style={sliderStyle}
          min={0}
          max={200}
          value={density}
          onChange={(e) => setDensity(Number(e.target.value))}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <label style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.85)',
          }}>
            速度
          </label>
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'system-ui',
          }}>
            {speed.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          className="control-slider"
          style={sliderStyle}
          min={10}
          max={500}
          value={speed * 100}
          onChange={(e) => setSpeed(Number(e.target.value) / 100)}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <label style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.85)',
          }}>
            风向
          </label>
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'system-ui',
          }}>
            {Math.round((windDirection * 180 / Math.PI + 360) % 360)}°
          </span>
        </div>
        <input
          type="range"
          className="control-slider"
          style={sliderStyle}
          min={0}
          max={360}
          value={(windDirection * 180 / Math.PI + 360) % 360}
          onChange={(e) => setWindDirection(Number(e.target.value) * Math.PI / 180)}
        />
      </div>

      <button
        onClick={() => handleButtonPress('cycle', cycleWeather)}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'system-ui',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.4), rgba(150, 100, 255, 0.4))',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isPressed === 'cycle' ? 'scale(0.95)' : 'scale(1)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 10px rgba(100, 150, 255, 0.2)',
          marginBottom: '12px',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg, rgba(100, 150, 255, 0.55), rgba(150, 100, 255, 0.55))'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            'linear-gradient(135deg, rgba(100, 150, 255, 0.4), rgba(150, 100, 255, 0.4))'
        }}
      >
        🔄 切换天气动画
      </button>

      <div style={{
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.6,
        fontFamily: 'system-ui',
      }}>
        <div style={{ marginBottom: '4px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          💡 操作提示
        </div>
        <div>• 拖拽：旋转视角</div>
        <div>• 滚轮：缩放</div>
        <div>• 点击地形：生成雷电</div>
      </div>

      {isMobile && (
        <button
          onClick={() => setIsPanelOpen(false)}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'system-ui',
            transition: 'all 0.2s ease',
            transform: isPressed === 'close' ? 'scale(0.95)' : 'scale(1)',
          }}
          onClickCapture={() => setIsPressed('close')}
        >
          关闭面板
        </button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        {isPanelOpen && (
          <div
            onClick={() => setIsPanelOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '280px',
            maxWidth: '85vw',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            zIndex: 999,
            transform: isPanelOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowY: 'auto',
            color: '#fff',
            fontFamily: 'system-ui',
          }}
        >
          {panelContent}
        </div>
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(100, 150, 255, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 20px rgba(100, 150, 255, 0.4)',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            transform: isPressed === 'toggle' ? 'scale(0.9)' : 'scale(1)',
          }}
          onClickCapture={() => setIsPressed('toggle')}
        >
          {isPanelOpen ? '✕' : '⚙️'}
        </button>
      </>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '16px',
        top: '16px',
        bottom: '16px',
        width: '240px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 100,
        overflowY: 'auto',
        color: '#fff',
        fontFamily: 'system-ui',
      }}
    >
      {panelContent}
    </div>
  )
}
