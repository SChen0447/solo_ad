import { useState, useEffect, useRef } from 'react'

interface Props {
  total: number
  totalKm: number
  maxStreak: number
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValueRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = prevValueRef.current
    const endValue = value
    const startTime = performance.now()

    setIsAnimating(true)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOutBack = (t: number) => {
        const c1 = 1.70158
        const c3 = c1 + 1
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
      }

      const easedProgress = easeOutBack(progress)
      const current = Math.round(startValue + (endValue - startValue) * easedProgress)
      setDisplayValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
        setIsAnimating(false)
        prevValueRef.current = endValue
      }
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  return (
    <span className={`animated-number ${isAnimating ? 'bouncing' : ''}`}>
      {displayValue.toLocaleString()}
    </span>
  )
}

function StatsCard({ total, totalKm, maxStreak }: Props) {
  return (
    <div className="stats-card">
      <div className="stats-title">旅行统计</div>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">
            <AnimatedNumber value={total} />
          </div>
          <div className="stat-label">地标数量</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            <AnimatedNumber value={totalKm} />
            <span className="stat-unit">km</span>
          </div>
          <div className="stat-label">总里程</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            <AnimatedNumber value={maxStreak} />
            <span className="stat-unit">天</span>
          </div>
          <div className="stat-label">最长连续</div>
        </div>
      </div>
    </div>
  )
}

export default StatsCard
