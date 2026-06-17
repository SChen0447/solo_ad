import { useEffect, useRef, useState } from 'react'

export const useTypewriter = (text: string, speed: number = 60) => {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    clearTimer()
    setDisplayText('')
    setIsComplete(false)
    indexRef.current = 0

    if (!text) {
      setIsComplete(true)
      return
    }

    timerRef.current = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current >= text.length) {
        setDisplayText(text)
        setIsComplete(true)
        clearTimer()
      } else {
        setDisplayText(text.slice(0, indexRef.current))
      }
    }, speed)

    return clearTimer
  }, [text, speed])

  return { displayText, isComplete }
}

export const useFadeIn = (duration: number = 500) => {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), 10)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.8)',
    transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
  }

  return { style, visible }
}

export const useHeartbeat = () => {
  const [beating, setBeating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setBeating(true)
    timerRef.current = setTimeout(() => setBeating(false), 400)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { beating, trigger }
}

export const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '').trim()
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  const r = parseInt(full.substring(0, 2), 16) || 0
  const g = parseInt(full.substring(2, 4), 16) || 0
  const b = parseInt(full.substring(4, 6), 16) || 0
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export const radialGradient = (primary: string, secondary: string): string => {
  return `radial-gradient(circle at 30% 30%, ${primary} 0%, ${secondary} 70%, #0a0a1a 100%)`
}
