import { useRef, useCallback, useEffect, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

const Slider = ({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderProps) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="control-row">
      <span className="control-label" style={{ minWidth: 50 }}>
        {label}
      </span>
      <div className="slider-container">
        <input
          type="range"
          className="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, #4fc3f7 0%, #c44dff ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
      <span className="control-value">
        {value.toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </div>
  )
}

interface CircularSliderProps {
  value: number
  min: number
  max: number
  label: string
  onChange: (value: number) => void
  size?: number
}

const CircularSlider = ({ value, min, max, label, onChange, size = 70 }: CircularSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const percentage = ((value - min) / (max - min)) * 100
  const angle = (percentage / 100) * 360 - 90
  const radius = size / 2 - 10
  const handleX = size / 2 + radius * Math.cos((angle * Math.PI) / 180)
  const handleY = size / 2 + radius * Math.sin((angle * Math.PI) / 180)

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = clientX - centerX
      const dy = clientY - centerY
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (deg < 0) deg += 360
      const newValue = (deg / 360) * (max - min) + min
      onChange(Math.max(min, Math.min(max, newValue)))
    },
    [min, max, onChange]
  )

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onUp = () => setDragging(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, handleMove])

  return (
    <div className="angle-slider">
      <div className="angle-slider-label">{label}</div>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: size,
          height: size,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={(e) => {
          setDragging(true)
          handleMove(e.clientX, e.clientY)
        }}
      >
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4fc3f7" />
              <stop offset="100%" stopColor="#c44dff" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * radius}
            strokeDashoffset={2 * Math.PI * radius * (1 - percentage / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(79, 195, 247, 0.6)',
            left: handleX - 7,
            top: handleY - 7,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 11,
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(value)}°
        </div>
      </div>
    </div>
  )
}

const ColorWheel = () => {
  const wheelRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const pointColor = useSceneStore((s) => s.lighting.point.color)
  const setPointLight = useSceneStore((s) => s.setPointLight)
  const [indicatorPos, setIndicatorPos] = useState({ x: 50, y: 50 })

  const hexToHsv = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const v = max
    if (max !== min) {
      const d = max - min
      s = max === 0 ? 0 : d / max
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }
    return { h: h * 360, s, v }
  }

  const hsvToHex = (h: number, s: number, v: number) => {
    h /= 360
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    let r = 0
    let g = 0
    let b = 0
    switch (i % 6) {
      case 0:
        r = v
        g = t
        b = p
        break
      case 1:
        r = q
        g = v
        b = p
        break
      case 2:
        r = p
        g = v
        b = t
        break
      case 3:
        r = p
        g = q
        b = v
        break
      case 4:
        r = t
        g = p
        b = v
        break
      case 5:
        r = v
        g = p
        b = q
        break
    }
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  useEffect(() => {
    const hsv = hexToHsv(pointColor)
    const rad = (hsv.h * Math.PI) / 180
    const r = hsv.s * 40
    setIndicatorPos({
      x: 50 + r * Math.cos(rad),
      y: 50 + r * Math.sin(rad),
    })
  }, [pointColor])

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return
      const rect = wheelRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 100
      const y = ((clientY - rect.top) / rect.height) * 100
      const cx = 50
      const cy = 50
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = 40
      if (dist > maxDist) {
        const ratio = maxDist / dist
        setIndicatorPos({ x: cx + dx * ratio, y: cy + dy * ratio })
      } else {
        setIndicatorPos({ x, y })
      }
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      const h = angle < 0 ? angle + 360 : angle
      const s = Math.min(dist / maxDist, 1)
      setPointLight({ color: hsvToHex(h, s, 1) })
    },
    [setPointLight]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, handleMove])

  return (
    <div className="control-row" style={{ alignItems: 'flex-start' }}>
      <span className="control-label" style={{ minWidth: 50, marginTop: 28 }}>
        颜色
      </span>
      <div
        ref={wheelRef}
        className="color-wheel"
        onMouseDown={(e) => {
          setDragging(true)
          handleMove(e.clientX, e.clientY)
        }}
        style={{ flex: 1 }}
      >
        <div
          className="color-wheel-indicator"
          style={{
            left: `${indicatorPos.x}%`,
            top: `${indicatorPos.y}%`,
            background: pointColor,
          }}
        />
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: pointColor,
          border: '2px solid rgba(255,255,255,0.2)',
          marginTop: 22,
        }}
      />
    </div>
  )
}

const LightControls = () => {
  const lighting = useSceneStore((s) => s.lighting)
  const setDirectionalLight = useSceneStore((s) => s.setDirectionalLight)
  const setAmbientLight = useSceneStore((s) => s.setAmbientLight)
  const setPointLight = useSceneStore((s) => s.setPointLight)

  return (
    <div className="glass-panel light-controls">
      <div className="light-group">
        <div className="panel-title">方向光</div>
        <div className="angle-controls">
          <CircularSlider
            label="水平角"
            value={lighting.directional.azimuth}
            min={0}
            max={360}
            onChange={(v) => setDirectionalLight({ azimuth: v })}
          />
          <CircularSlider
            label="仰角"
            value={lighting.directional.elevation}
            min={0}
            max={90}
            onChange={(v) => setDirectionalLight({ elevation: v })}
          />
        </div>
      </div>

      <div className="light-group">
        <div className="panel-title">环境光</div>
        <Slider
          label="强度"
          value={lighting.ambient.intensity}
          min={0}
          max={2}
          onChange={(v) => setAmbientLight({ intensity: v })}
        />
      </div>

      <div className="light-group">
        <div className="panel-title">点光源</div>
        <ColorWheel />
        <Slider
          label="X"
          value={lighting.point.position.x}
          min={-5}
          max={5}
          onChange={(v) => setPointLight({ position: { ...lighting.point.position, x: v } })}
        />
        <Slider
          label="Y"
          value={lighting.point.position.y}
          min={0.5}
          max={5}
          onChange={(v) => setPointLight({ position: { ...lighting.point.position, y: v } })}
        />
        <Slider
          label="强度"
          value={lighting.point.intensity}
          min={0}
          max={3}
          onChange={(v) => setPointLight({ intensity: v })}
        />
      </div>
    </div>
  )
}

export default LightControls
