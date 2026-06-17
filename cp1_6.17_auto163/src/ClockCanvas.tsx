import React, { useRef, useEffect, useCallback } from 'react'

interface Theme {
  primary: string
  secondary: string
  background: string
}

interface ClockCanvasProps {
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
  currentTheme: Theme
  targetTheme: Theme
  themeTransitionProgress: number
  scale: number
  mouseX: number
  mouseY: number
  isHovering: boolean
  hoverProgress: number
  canvasRef: React.RefObject<HTMLCanvasElement>
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const GLOW_PERIOD = 3000
const LETTER_ROTATION_PERIOD = 10000
const MINUTE_ANIMATION_DURATION = 500

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 255, b: 255 }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t)
}

const getGlowHue = (time: number): number => {
  const phase = (time % GLOW_PERIOD) / GLOW_PERIOD
  if (phase < 0.5) {
    return 270 + phase * 60
  } else {
    return 300 - (phase - 0.5) * 60
  }
}

const elasticOut = (t: number): number => {
  const p = 0.3
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
}

const ClockCanvas: React.FC<ClockCanvasProps> = ({
  hours,
  minutes,
  seconds,
  milliseconds,
  currentTheme,
  targetTheme,
  themeTransitionProgress,
  scale,
  mouseX,
  mouseY,
  isHovering,
  hoverProgress,
  canvasRef,
}) => {
  const animationRef = useRef<number>(0)
  const lastMinuteRef = useRef<number>(-1)
  const minuteAnimationStartRef = useRef<number>(-1)
  const animatedMinuteRef = useRef<number>(-1)

  const getInterpolatedTheme = useCallback((): Theme => {
    if (themeTransitionProgress >= 1) {
      return targetTheme
    }
    return {
      primary: lerpColor(currentTheme.primary, targetTheme.primary, themeTransitionProgress),
      secondary: lerpColor(currentTheme.secondary, targetTheme.secondary, themeTransitionProgress),
      background: lerpColor(currentTheme.background, targetTheme.background, themeTransitionProgress),
    }
  }, [currentTheme, targetTheme, themeTransitionProgress])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width * dpr
    const height = rect.height * dpr

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const centerX = width / 2
    const centerY = height / 2
    const baseSize = Math.min(width, height)
    const effectiveScale = scale * 0.9

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(effectiveScale, effectiveScale)

    const theme = getInterpolatedTheme()
    const time = Date.now()
    const glowHue = getGlowHue(time)

    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes
      minuteAnimationStartRef.current = time
      animatedMinuteRef.current = minutes
    }

    const drawMinuteDots = () => {
      const dotRadius = baseSize * 0.38
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(angle) * dotRadius
        const y = Math.sin(angle) * dotRadius

        let dotSize = 3 * dpr
        let opacity = 0.2
        let color = theme.primary

        if (i < minutes) {
          dotSize = 6 * dpr
          opacity = 0.8
        } else if (i === minutes && minuteAnimationStartRef.current > 0) {
          const elapsed = time - minuteAnimationStartRef.current
          const progress = Math.min(1, elapsed / MINUTE_ANIMATION_DURATION)
          const elasticProgress = elasticOut(progress)
          dotSize = 3 * dpr + (6 * dpr - 3 * dpr) * elasticProgress
          opacity = 0.2 + (0.8 - 0.2) * elasticProgress
        }

        ctx.beginPath()
        ctx.arc(x, y, dotSize, 0, Math.PI * 2)

        const rgb = hexToRgb(color)
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
        ctx.shadowColor = color
        ctx.shadowBlur = opacity > 0.5 ? 15 * dpr : 5 * dpr
        ctx.fill()
      }
    }

    const drawLetterRing = () => {
      const ringRadius = baseSize * 0.3
      const highlightIndex = seconds % 26
      const baseRotation = -(time / LETTER_ROTATION_PERIOD) * Math.PI * 2
      const highlightTargetAngle = -Math.PI / 2
      const highlightCurrentAngle = (highlightIndex / 26) * Math.PI * 2 - Math.PI / 2 + baseRotation
      const rotationOffset = highlightTargetAngle - highlightCurrentAngle

      ctx.save()
      ctx.rotate(rotationOffset)

      for (let i = 0; i < 26; i++) {
        const angle = (i / 26) * Math.PI * 2 - Math.PI / 2 + baseRotation
        const x = Math.cos(angle) * ringRadius
        const y = Math.sin(angle) * ringRadius
        const letter = ALPHABET[i]

        let fontSize = baseSize * 0.04
        let opacity = 0.3
        let color = '#888888'
        let letterGlow = 0

        if (i === highlightIndex) {
          fontSize = baseSize * 0.08
          opacity = 1
          color = `hsl(${(time / 20) % 360}, 100%, 60%)`
          letterGlow = 20 * dpr
        }

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle + Math.PI / 2)
        ctx.font = `bold ${fontSize}px 'Orbitron', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = color
        ctx.globalAlpha = opacity
        ctx.shadowColor = color
        ctx.shadowBlur = letterGlow
        ctx.fillText(letter, 0, 0)
        ctx.restore()
      }

      ctx.restore()
    }

    const drawDigitalTime = () => {
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      const fontSize = baseSize * 0.8 * 0.15

      const glowColor1 = `hsla(${glowHue}, 100%, 60%, 0.8)`
      const glowColor2 = `hsla(${(glowHue + 30) % 360}, 100%, 60%, 0.6)`

      ctx.save()
      ctx.shadowColor = glowColor1
      ctx.shadowBlur = 30 * dpr
      ctx.font = `900 ${fontSize}px 'Orbitron', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = glowColor2
      ctx.fillText(timeStr, 0, 0)

      ctx.shadowBlur = 15 * dpr
      ctx.shadowColor = theme.secondary
      ctx.fillStyle = '#ffffff'
      ctx.fillText(timeStr, 0, 0)

      ctx.restore()
    }

    const drawTrackingRing = () => {
      if (hoverProgress <= 0) return

      const ringRadius = baseSize * 0.45
      const hue = (mouseX / (canvas.clientWidth || 1)) * 360
      const color = `hsla(${hue}, 100%, 60%, ${hoverProgress})`

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2 * dpr * hoverProgress
      ctx.shadowColor = color
      ctx.shadowBlur = 20 * dpr * hoverProgress
      ctx.beginPath()
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    drawMinuteDots()
    drawLetterRing()
    drawDigitalTime()
    drawTrackingRing()

    ctx.restore()

    animationRef.current = requestAnimationFrame(draw)
  }, [
    hours,
    minutes,
    seconds,
    milliseconds,
    scale,
    mouseX,
    mouseY,
    isHovering,
    hoverProgress,
    getInterpolatedTheme,
    canvasRef,
  ])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="clock-canvas"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
}

export default ClockCanvas
