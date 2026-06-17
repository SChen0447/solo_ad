import React, { useState, useEffect, useRef, useCallback } from 'react'
import ClockCanvas from './ClockCanvas'

interface Theme {
  name: string
  primary: string
  secondary: string
  background: string
}

const themes: Theme[] = [
  { name: 'cyberpunk', primary: '#00FFFF', secondary: '#FF00FF', background: '#1A0033' },
  { name: 'vaporwave', primary: '#E6A8D7', secondary: '#A8D7E6', background: '#2D1B2E' },
  { name: 'aurora', primary: '#00FF7F', secondary: '#8A2BE2', background: '#0B0C10' },
]

const THEME_TRANSITION_DURATION = 1500
const HOVER_TRANSITION_DURATION = 300
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const App: React.FC = () => {
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    date: new Date(),
  })

  const [currentThemeIndex, setCurrentThemeIndex] = useState(0)
  const [targetThemeIndex, setTargetThemeIndex] = useState(0)
  const [themeTransitionProgress, setThemeTransitionProgress] = useState(1)
  const themeTransitionStartRef = useRef<number>(-1)

  const [scale, setScale] = useState(1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [hoverProgress, setHoverProgress] = useState(0)
  const hoverTransitionStartRef = useRef<number>(-1)
  const hoverTargetRef = useRef(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const currentTheme = themes[currentThemeIndex]
  const targetTheme = themes[targetThemeIndex]

  const updateTime = useCallback(() => {
    const now = new Date()
    setTime({
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      milliseconds: now.getMilliseconds(),
      date: now,
    })
  }, [])

  useEffect(() => {
    updateTime()

    const animate = () => {
      const now = Date.now()

      if (themeTransitionStartRef.current > 0) {
        const elapsed = now - themeTransitionStartRef.current
        const progress = Math.min(1, elapsed / THEME_TRANSITION_DURATION)
        setThemeTransitionProgress(progress)

        if (progress >= 1) {
          themeTransitionStartRef.current = -1
          setCurrentThemeIndex(targetThemeIndex)
        }
      }

      if (hoverTransitionStartRef.current > 0) {
        const elapsed = now - hoverTransitionStartRef.current
        const progress = Math.min(1, elapsed / HOVER_TRANSITION_DURATION)
        const target = hoverTargetRef.current
        setHoverProgress(target === 1 ? progress : 1 - progress)

        if (progress >= 1) {
          hoverTransitionStartRef.current = -1
        }
      }

      if (time.seconds !== new Date().getSeconds()) {
        updateTime()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [updateTime, targetThemeIndex, time.seconds])

  const handleThemeChange = (index: number) => {
    if (index === targetThemeIndex) return
    setTargetThemeIndex(index)
    setThemeTransitionProgress(0)
    themeTransitionStartRef.current = Date.now()
    hoverTargetRef.current = 0
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      return Math.max(0.5, Math.min(2, prev + delta))
    })
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    },
    []
  )

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
    hoverTargetRef.current = 1
    hoverTransitionStartRef.current = Date.now()
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    hoverTargetRef.current = 0
    hoverTransitionStartRef.current = Date.now()
  }, [])

  const getTimezone = () => {
    const offset = -time.date.getTimezoneOffset() / 60
    const sign = offset >= 0 ? '+' : ''
    return `UTC${sign}${offset}`
  }

  const getCountdownToNextHour = () => {
    const now = time.date
    const nextHour = new Date(now)
    nextHour.setHours(now.getHours() + 1, 0, 0, 0)
    const diff = nextHour.getTime() - now.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${hours}小时${minutes}分${seconds}秒`
  }

  const formatDate = () => {
    const d = time.date
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`
  }

  const getInterpolatedColor = (color1: string, color2: string, t: number): string => {
    const hex = (x: string) => parseInt(x, 16)
    const r1 = hex(color1.slice(1, 3))
    const g1 = hex(color1.slice(3, 5))
    const b1 = hex(color1.slice(5, 7))
    const r2 = hex(color2.slice(1, 3))
    const g2 = hex(color2.slice(3, 5))
    const b2 = hex(color2.slice(5, 7))

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return `rgb(${r}, ${g}, ${b})`
  }

  const displayPrimary = getInterpolatedColor(
    currentTheme.primary,
    targetTheme.primary,
    themeTransitionProgress
  )
  const displaySecondary = getInterpolatedColor(
    currentTheme.secondary,
    targetTheme.secondary,
    themeTransitionProgress
  )

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', displayPrimary)
    document.documentElement.style.setProperty('--secondary-color', displaySecondary)
  }, [displayPrimary, displaySecondary])

  return (
    <div className="app-container theme-transition">
      <div className="info-panel">
        <div>
          <span className="info-label">日期</span>
          <br />
          <span className="info-value">{formatDate()}</span>
        </div>
        <div>
          <span className="info-label">时区</span>
          <br />
          <span className="info-value">{getTimezone()}</span>
        </div>
        <div>
          <span className="info-label">下一个整点</span>
          <br />
          <span className="info-value">{getCountdownToNextHour()}</span>
        </div>
      </div>

      <div className="clock-wrapper">
        <ClockCanvas
          hours={time.hours}
          minutes={time.minutes}
          seconds={time.seconds}
          milliseconds={time.milliseconds}
          currentTheme={currentTheme}
          targetTheme={targetTheme}
          themeTransitionProgress={themeTransitionProgress}
          scale={scale}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          isHovering={isHovering}
          hoverProgress={hoverProgress}
          canvasRef={canvasRef}
        />
      </div>

      <div
        className="clock-wrapper"
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
      />

      <div className="theme-buttons">
        {themes.map((theme, index) => (
          <button
            key={theme.name}
            className={`theme-button ${theme.name} ${index === targetThemeIndex ? 'active' : ''}`}
            onClick={() => handleThemeChange(index)}
            style={{ color: theme.primary }}
            aria-label={`切换到${theme.name}主题`}
          />
        ))}
      </div>
    </div>
  )
}

export default App
