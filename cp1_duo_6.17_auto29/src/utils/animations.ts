import { useEffect, useRef, useState } from 'react'

export const useTypewriter = (text: string, speed: number = 60) => {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    setDisplayText('')
    setIsComplete(false)
    indexRef.current = 0

    if (!text) {
      setIsComplete(true)
      return
    }

    const timer = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current >= text.length) {
        setDisplayText(text)
        setIsComplete(true)
        clearInterval(timer)
      } else {
        setDisplayText(text.slice(0, indexRef.current))
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return { displayText, isComplete }
}

export const useFadeIn = (duration: number = 500) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(timer)
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

  const trigger = () => {
    setBeating(true)
    setTimeout(() => setBeating(false), 400)
  }

  return { beating, trigger }
}

export const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const radialGradient = (primary: string, secondary: string): string => {
  return `radial-gradient(circle at 30% 30%, ${primary} 0%, ${secondary} 70%, #0a0a1a 100%)`
}
