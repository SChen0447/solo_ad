import React from 'react'
import { useStarStore, DEFAULTS } from '../store'
import { SliderControl } from './SliderControl'

export const ControlPanel: React.FC = () => {
  const activeTab = useStarStore((state) => state.activeTab)
  const setActiveTab = useStarStore((state) => state.setActiveTab)

  const starCount = useStarStore((state) => state.starCount)
  const setStarCount = useStarStore((state) => state.setStarCount)
  const speedMultiplier = useStarStore((state) => state.speedMultiplier)
  const setSpeedMultiplier = useStarStore((state) => state.setSpeedMultiplier)
  const orbitScale = useStarStore((state) => state.orbitScale)
  const setOrbitScale = useStarStore((state) => state.setOrbitScale)
  const trailLength = useStarStore((state) => state.trailLength)
  const setTrailLength = useStarStore((state) => state.setTrailLength)
  const blurIntensity = useStarStore((state) => state.blurIntensity)
  const setBlurIntensity = useStarStore((state) => state.setBlurIntensity)
  const colorGradientMode = useStarStore((state) => state.colorGradientMode)
  const setColorGradientMode = useStarStore((state) => state.setColorGradientMode)
  const resetView = useStarStore((state) => state.resetView)
  const fps = useStarStore((state) => state.fps)

  const tabs = [
    { id: 'settings' as const, label: '星轨设置' },
    { id: 'filters' as const, label: '外观滤镜' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        width: '260px',
        background: 'rgba(20, 20, 40, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '40px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: activeTab === tab.id ? 'rgba(155, 89, 182, 0.2)' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #9b59b6, #3498db)',
                  borderRadius: '1px',
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>
        {activeTab === 'settings' && (
          <>
            <SliderControl
              label="星星数量"
              value={starCount}
              min={50}
              max={500}
              step={10}
              onChange={setStarCount}
              onReset={() => setStarCount(DEFAULTS.starCount)}
              defaultValue={DEFAULTS.starCount}
              unit=" 颗"
            />
            <SliderControl
              label="轨道半径缩放"
              value={orbitScale}
              min={0.5}
              max={2.0}
              step={0.1}
              onChange={setOrbitScale}
              onReset={() => setOrbitScale(DEFAULTS.orbitScale)}
              defaultValue={DEFAULTS.orbitScale}
              unit="x"
            />
            <SliderControl
              label="运动速度"
              value={speedMultiplier}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={setSpeedMultiplier}
              onReset={() => setSpeedMultiplier(DEFAULTS.speedMultiplier)}
              defaultValue={DEFAULTS.speedMultiplier}
              unit="x"
            />
            <SliderControl
              label="轨迹长度"
              value={trailLength}
              min={10}
              max={120}
              step={5}
              onChange={setTrailLength}
              onReset={() => setTrailLength(DEFAULTS.trailLength)}
              defaultValue={DEFAULTS.trailLength}
              unit=" 帧"
            />
          </>
        )}

        {activeTab === 'filters' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div
                onClick={() => setColorGradientMode(!colorGradientMode)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                  色彩渐变模式
                </span>
                <div
                  style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: colorGradientMode
                      ? 'linear-gradient(135deg, #9b59b6, #3498db)'
                      : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: colorGradientMode ? '20px' : '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </div>
              </div>
            </div>

            <SliderControl
              label="拖尾模糊强度"
              value={blurIntensity}
              min={0}
              max={1.0}
              step={0.05}
              onChange={setBlurIntensity}
              onReset={() => setBlurIntensity(DEFAULTS.blurIntensity)}
              defaultValue={DEFAULTS.blurIntensity}
            />

            <button
              onClick={resetView}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '10px',
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.3), rgba(52, 152, 219, 0.3))',
                border: '1px solid rgba(155, 89, 182, 0.4)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(155, 89, 182, 0.5), rgba(52, 152, 219, 0.5))'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(155, 89, 182, 0.3), rgba(52, 152, 219, 0.3))'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              重置视角
            </button>
          </>
        )}
      </div>

      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>
          FPS
        </span>
        <span
          style={{
            color: fps >= 50 ? '#2ecc71' : fps >= 30 ? '#f1c40f' : '#e74c3c',
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {fps.toFixed(0)}
        </span>
      </div>
    </div>
  )
}
