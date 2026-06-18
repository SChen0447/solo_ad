import { useState, useEffect } from 'react'
import { useMathStore, type ModelType } from './store'

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    padding: '24px 20px',
    background: 'rgba(15, 15, 35, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    boxSizing: 'border-box',
    overflowY: 'auto',
    zIndex: 100,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    color: '#e0e0f0',
  },
  panelMobile: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    padding: '24px 20px',
    background: 'rgba(15, 15, 35, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
    boxSizing: 'border-box',
    overflowY: 'auto',
    zIndex: 100,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    color: '#e0e0f0',
  },
  panelMobileOpen: {
    transform: 'translateX(0)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#ff6b35',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    fontSizeAdjust: 0.5,
  },
  section: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#a0a0c0',
    marginBottom: '8px',
    fontWeight: 500,
  },
  select: {
    width: '100%',
    minWidth: '160px',
    padding: '10px 14px',
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    color: '#e0e0f0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0a0c0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  },
  sliderContainer: {
    marginBottom: '16px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sliderLabel: {
    fontSize: '13px',
    color: '#a0a0c0',
    fontWeight: 500,
  },
  sliderValue: {
    fontSize: '13px',
    color: '#ff6b35',
    fontWeight: 600,
    fontFamily: 'monospace',
    minWidth: '50px',
    textAlign: 'right' as const,
  },
  slider: {
    width: '100%',
    minWidth: '160px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    appearance: 'none' as const,
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15), transparent)',
    margin: '20px 0',
  },
  modelInfo: {
    fontSize: '12px',
    color: '#707090',
    lineHeight: 1.6,
    marginTop: '12px',
  },
  fabButton: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(15, 15, 35, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#e0e0f0',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: 99,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 98,
    opacity: 0,
    pointerEvents: 'none' as const,
    transition: 'opacity 0.3s ease',
  },
  overlayVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (v: number) => string
}) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderHeader}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValue}>{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          ...styles.slider,
          background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${percentage}%, rgba(30, 30, 60, 0.8) ${percentage}%, rgba(30, 30, 60, 0.8) 100%)`,
        }}
      />
    </div>
  )
}

export default function ControlPanel() {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const modelType = useMathStore((state) => state.modelType)
  const mandelbrotParams = useMathStore((state) => state.mandelbrotParams)
  const juliaParams = useMathStore((state) => state.juliaParams)
  const minimalParams = useMathStore((state) => state.minimalParams)
  const setModelType = useMathStore((state) => state.setModelType)
  const setMandelbrotParams = useMathStore((state) => state.setMandelbrotParams)
  const setJuliaParams = useMathStore((state) => state.setJuliaParams)
  const setMinimalParams = useMathStore((state) => state.setMinimalParams)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1200)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const modelOptions: { value: ModelType; label: string; desc: string }[] = [
    { value: 'mandelbrot', label: 'Mandelbrot 集合', desc: '经典分形的三维高度图版本' },
    { value: 'julia', label: 'Julia 集合', desc: '复参数 C 可调的分形变体' },
    { value: 'minimal', label: '极小曲面', desc: 'Enneper 曲面参数化演示' },
  ]

  const panelStyle = isMobile
    ? { ...styles.panelMobile, ...(isOpen ? styles.panelMobileOpen : {}) }
    : styles.panel

  const currentModel = modelOptions.find((m) => m.value === modelType)

  return (
    <>
      {isMobile && (
        <>
          <div
            style={{ ...styles.overlay, ...(isOpen ? styles.overlayVisible : {}) }}
            onClick={() => setIsOpen(false)}
          />
          <button
            style={styles.fabButton}
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(40, 40, 70, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 15, 35, 0.85)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            }}
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </>
      )}

      <div style={panelStyle}>
        <h2 style={styles.title}>数学探索器</h2>

        <div style={styles.section}>
          <label style={styles.label}>模型类型</label>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value as ModelType)}
            style={styles.select}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#ff6b35'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 107, 53, 0.2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {modelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p style={styles.modelInfo}>{currentModel?.desc}</p>
        </div>

        <div style={styles.divider} />

        {modelType === 'mandelbrot' && (
          <div style={styles.section}>
            <Slider
              label="迭代次数"
              value={mandelbrotParams.iterations}
              min={10}
              max={200}
              step={10}
              onChange={(v) => setMandelbrotParams({ iterations: v })}
              format={(v) => Math.round(v).toString()}
            />
            <Slider
              label="分辨率"
              value={mandelbrotParams.resolution}
              min={64}
              max={400}
              step={16}
              onChange={(v) => setMandelbrotParams({ resolution: Math.round(v) })}
              format={(v) => `${Math.round(v)}²`}
            />
          </div>
        )}

        {modelType === 'julia' && (
          <div style={styles.section}>
            <Slider
              label="C 实部 (Re)"
              value={juliaParams.cx}
              min={-2}
              max={2}
              step={0.01}
              onChange={(v) => setJuliaParams({ cx: v })}
            />
            <Slider
              label="C 虚部 (Im)"
              value={juliaParams.cy}
              min={-2}
              max={2}
              step={0.01}
              onChange={(v) => setJuliaParams({ cy: v })}
            />
            <Slider
              label="迭代次数"
              value={juliaParams.iterations}
              min={10}
              max={200}
              step={10}
              onChange={(v) => setJuliaParams({ iterations: Math.round(v) })}
              format={(v) => Math.round(v).toString()}
            />
            <Slider
              label="分辨率"
              value={juliaParams.resolution}
              min={64}
              max={400}
              step={16}
              onChange={(v) => setJuliaParams({ resolution: Math.round(v) })}
              format={(v) => `${Math.round(v)}²`}
            />
          </div>
        )}

        {modelType === 'minimal' && (
          <div style={styles.section}>
            <Slider
              label="参数 t"
              value={minimalParams.t}
              min={0.1}
              max={2.0}
              step={0.01}
              onChange={(v) => setMinimalParams({ t: v })}
            />
            <Slider
              label="分辨率"
              value={minimalParams.resolution}
              min={32}
              max={256}
              step={8}
              onChange={(v) => setMinimalParams({ resolution: Math.round(v) })}
              format={(v) => `${Math.round(v)}²`}
            />
          </div>
        )}

        <div style={styles.divider} />

        <div style={styles.modelInfo}>
          <p style={{ marginBottom: '8px' }}>💡 操作提示：</p>
          <p>• 拖拽旋转视角</p>
          <p>• 滚轮缩放 (1x-20x)</p>
          <p>• 右键平移</p>
          <p>• 双指支持触屏</p>
        </div>
      </div>
    </>
  )
}
