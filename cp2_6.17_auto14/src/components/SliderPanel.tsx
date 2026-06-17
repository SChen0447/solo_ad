import { useStore, EMOTION_CONFIGS } from '@/store/useStore'

interface SliderPanelProps {
  mobileOpen: boolean
}

export default function SliderPanel({ mobileOpen }: SliderPanelProps) {
  const particleCount = useStore((s) => s.particleCount)
  const particleSize = useStore((s) => s.particleSize)
  const motionSpeed = useStore((s) => s.motionSpeed)
  const emotionMode = useStore((s) => s.emotionMode)
  const setParticleCount = useStore((s) => s.setParticleCount)
  const setParticleSize = useStore((s) => s.setParticleSize)
  const setMotionSpeed = useStore((s) => s.setMotionSpeed)

  const themeColor = EMOTION_CONFIGS[emotionMode].hex

  return (
    <div
      className={`slider-panel glass ${mobileOpen ? 'mobile-open' : ''}`}
      style={{ '--slider-color': themeColor } as React.CSSProperties}
    >
      <div className="slider-group">
        <label>
          粒子数量 <span>{particleCount}</span>
        </label>
        <input
          type="range"
          min={100}
          max={3000}
          step={100}
          value={particleCount}
          onChange={(e) => setParticleCount(Number(e.target.value))}
        />
      </div>
      <div className="slider-group">
        <label>
          粒子大小 <span>{particleSize.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={0.8}
          step={0.05}
          value={particleSize}
          onChange={(e) => setParticleSize(Number(e.target.value))}
        />
      </div>
      <div className="slider-group">
        <label>
          运动速度 <span>{motionSpeed.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.2}
          max={2.0}
          step={0.1}
          value={motionSpeed}
          onChange={(e) => setMotionSpeed(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
