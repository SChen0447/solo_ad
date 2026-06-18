import { useRef, useEffect } from 'react'
import { useAnimationStore } from './store'
import CubicBezierEditor from './CubicBezierEditor'

const timingPresets = [
  { name: 'ease', value: 'ease' },
  { name: 'ease-in', value: 'ease-in' },
  { name: 'ease-out', value: 'ease-out' },
  { name: 'ease-in-out', value: 'ease-in-out' },
  { name: 'linear', value: 'linear' }
]

interface SliderProps {
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  label: string
  formatValue?: (value: number) => string
}

function Slider({ min, max, step, value, onChange, label, formatValue }: SliderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const progress = ((value - min) / (max - min)) * 100

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.setProperty('--progress', `${progress}%`)
    }
  }, [progress])

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{label}</div>
      <div style={styles.sliderRow}>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            ...styles.slider,
            '--progress': `${progress}%`
          } as React.CSSProperties}
        />
        <span style={styles.valueBadge}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
    </div>
  )
}

export default function ControlPanel() {
  const {
    params,
    setDuration,
    setDelay,
    setIterations,
    setTimingFunction
  } = useAnimationStore()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>参数控制面板</span>
      </div>

      <div style={styles.content}>
        <Slider
          label="持续时间"
          min={0.1}
          max={10}
          step={0.1}
          value={params.duration}
          onChange={setDuration}
          formatValue={(v) => `${v.toFixed(1)}s`}
        />

        <Slider
          label="延迟"
          min={0}
          max={5}
          step={0.1}
          value={params.delay}
          onChange={setDelay}
          formatValue={(v) => `${v.toFixed(1)}s`}
        />

        <Slider
          label="重复次数"
          min={1}
          max={10}
          step={1}
          value={params.iterations}
          onChange={setIterations}
          formatValue={(v) => (v === 10 ? '无限' : v.toString())}
        />

        <div style={styles.section}>
          <div style={styles.sectionTitle}>速度曲线</div>
          <div style={styles.presetGrid}>
            {timingPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setTimingFunction(preset.value)}
                style={{
                  ...styles.presetButton,
                  ...(params.timingFunction === preset.value && !params.useCubicBezier
                    ? styles.presetButtonActive
                    : {})
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div style={styles.bezierWrapper}>
            <CubicBezierEditor />
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#2a2a3e',
    borderRadius: '12px',
    overflow: 'hidden',
    height: '100%'
  },
  header: {
    padding: '14px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  content: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    flex: 1
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#a0a0b0'
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
    outline: 'none'
  } as React.CSSProperties,
  valueBadge: {
    minWidth: '50px',
    padding: '4px 8px',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    color: '#c4b5fd',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    textAlign: 'center',
    fontFamily: "'Fira Code', monospace"
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px'
  },
  presetButton: {
    padding: '8px 6px',
    fontSize: '12px',
    backgroundColor: '#3a3a4e',
    color: '#a0a0b0',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  presetButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    color: '#c4b5fd',
    borderColor: 'rgba(124, 58, 237, 0.5)'
  },
  bezierWrapper: {
    marginTop: '8px'
  }
}
