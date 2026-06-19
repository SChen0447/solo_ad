import React, { useEffect, useRef, useState } from 'react'
import type { Announcement } from '@/types'

interface AnnouncementBarProps {
  announcements: Announcement[]
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ announcements }) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [animationDuration, setAnimationDuration] = useState<string>('16s')
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!announcements.length) return

    const measureWidths = () => {
      const items = itemRefs.current.filter(Boolean) as HTMLSpanElement[]
      if (items.length === 0) return

      const totalSingleWidth = items.reduce(
        (acc, el) => acc + el.getBoundingClientRect().width,
        0
      )
      const avgItemWidth = totalSingleWidth / items.length
      const perItemSeconds = 2
      const totalSeconds = Math.max(announcements.length * perItemSeconds, 8)

      const durationPerPx = (perItemSeconds * 1000) / avgItemWidth
      const actualDuration = (totalSingleWidth * durationPerPx) / 1000
      const finalDuration = Math.max(actualDuration, totalSeconds)

      setAnimationDuration(`${finalDuration.toFixed(2)}s`)
    }

    const timer = window.setTimeout(measureWidths, 50)

    window.addEventListener('resize', measureWidths)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measureWidths)
    }
  }, [announcements])

  if (!announcements.length) return null

  const trackStyle: React.CSSProperties = {
    animationDuration,
    animationPlayState: isPaused ? ('paused' as const) : ('running' as const)
  }

  const items = announcements.map((a) => (
    <span
      key={a.id}
      className="announcement-item"
      ref={(el) => (itemRefs.current[announcements.indexOf(a)] = el)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.39 4.84L20 7.27l-4 3.9.94 5.5L12 14.77 7.06 16.67 8 11.17l-4-3.9 5.61-.43L12 2z" />
      </svg>
      {a.content}
    </span>
  ))

  return (
    <div
      className="announcement-bar"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="announcement-track" ref={trackRef} style={trackStyle}>
        {items}
        {items}
      </div>
    </div>
  )
}
