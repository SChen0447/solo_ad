import { useControls, button } from 'leva'
import { OrbitType } from '../utils/trajectoryUtils'

interface OrbitSelectorProps {
  orbitType: OrbitType
  onOrbitChange: (type: OrbitType) => void
  particleCount: number
  onParticleCountChange: (count: number) => void
}

const ORBIT_LABELS: Record<OrbitType, string> = {
  spiral: '螺旋轨道',
  wave: '波浪轨道',
  ring: '环形轨道',
}

export default function OrbitSelector({
  orbitType,
  onOrbitChange,
  particleCount,
  onParticleCountChange,
}: OrbitSelectorProps) {
  useControls('星轨舞者', {
    '当前轨道': { value: ORBIT_LABELS[orbitType], editable: false },
    '粒子数量': {
      value: particleCount,
      min: 100,
      max: 1000,
      step: 50,
      onChange: (v) => onParticleCountChange(v),
    },
    '螺旋轨道': button(() => onOrbitChange('spiral')),
    '波浪轨道': button(() => onOrbitChange('wave')),
    '环形轨道': button(() => onOrbitChange('ring')),
  }, [orbitType, particleCount])

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 100,
    }}>
      {(Object.entries(ORBIT_LABELS) as [OrbitType, string][]).map(([type, label]) => (
        <button
          key={type}
          onClick={() => onOrbitChange(type)}
          style={{
            padding: '10px 22px',
            background: orbitType === type
              ? 'rgba(106, 13, 173, 0.45)'
              : 'rgba(255, 255, 255, 0.06)',
            border: orbitType === type
              ? '1px solid rgba(160, 80, 255, 0.8)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            color: orbitType === type ? '#e0b0ff' : 'rgba(255, 255, 255, 0.65)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: orbitType === type
              ? '0 0 18px rgba(160, 80, 255, 0.35), inset 0 0 12px rgba(160, 80, 255, 0.1)'
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '1px',
          }}
          onMouseEnter={(e) => {
            if (orbitType !== type) {
              e.currentTarget.style.border = '1px solid rgba(160, 80, 255, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 14px rgba(160, 80, 255, 0.25)'
              e.currentTarget.style.color = 'rgba(224, 176, 255, 0.9)'
            }
          }}
          onMouseLeave={(e) => {
            if (orbitType !== type) {
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
