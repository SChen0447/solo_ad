import { useCallback, useRef } from 'react'
import { useStore, EMOTION_CONFIGS, EmotionMode } from '@/store/useStore'

const EMOTIONS: EmotionMode[] = ['joy', 'calm', 'sorrow', 'fervor']

export default function EmotionPanel() {
  const emotionMode = useStore((s) => s.emotionMode)
  const setEmotionMode = useStore((s) => s.setEmotionMode)

  const handleClick = useCallback(
    (mode: EmotionMode, e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = e.currentTarget
      const rect = btn.getBoundingClientRect()
      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      const size = Math.max(rect.width, rect.height)
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`
      btn.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
      setEmotionMode(mode)
    },
    [setEmotionMode]
  )

  return (
    <div className="emotion-panel glass">
      {EMOTIONS.map((mode) => {
        const cfg = EMOTION_CONFIGS[mode]
        return (
          <button
            key={mode}
            className={`emotion-btn ${emotionMode === mode ? 'active' : ''}`}
            style={{ backgroundColor: cfg.hex, color: cfg.hex }}
            data-label={cfg.label}
            onClick={(e) => handleClick(mode, e)}
          />
        )
      })}
    </div>
  )
}
