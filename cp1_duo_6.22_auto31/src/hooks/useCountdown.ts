import { useState, useEffect, useRef } from 'react'

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export const useCountdown = (targetDate: Date): CountdownResult => {
  const [timeLeft, setTimeLeft] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  })
  
  const animationFrameRef = useRef<number>()
  const targetTimestamp = targetDate.getTime()

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const diff = targetTimestamp - now

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      })

      animationFrameRef.current = requestAnimationFrame(updateCountdown)
    }

    animationFrameRef.current = requestAnimationFrame(updateCountdown)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetTimestamp])

  return timeLeft
}
