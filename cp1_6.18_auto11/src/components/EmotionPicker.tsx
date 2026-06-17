import { useState, useEffect, useRef } from 'react'
import { EMOTIONS, EmotionType } from '@/types'

interface EmotionPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (emotion: EmotionType, memo?: string) => void
  onDelete: () => void
  selectedEmotion?: EmotionType
  initialMemo?: string
  position: { x: number; y: number }
  date: string
}

export default function EmotionPicker({
  isOpen,
  onClose,
  onSelect,
  onDelete,
  selectedEmotion,
  initialMemo,
  position,
  date
}: EmotionPickerProps) {
  const [memo, setMemo] = useState(initialMemo || '')
  const [activeEmotion, setActiveEmotion] = useState<EmotionType | undefined>(selectedEmotion)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMemo(initialMemo || '')
    setActiveEmotion(selectedEmotion)
  }, [initialMemo, selectedEmotion, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleEmotionClick = (emotion: EmotionType) => {
    setActiveEmotion(emotion)
  }

  const handleConfirm = () => {
    if (activeEmotion) {
      onSelect(activeEmotion, memo.trim() || undefined)
    }
  }

  if (!isOpen) return null

  const emotions = Object.values(EMOTIONS)

  return (
    <div
      ref={pickerRef}
      className="emotion-picker"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="picker-date">{date}</div>
      <div className="emotion-options">
        {emotions.map((emotion) => (
          <button
            key={emotion.type}
            className={`emotion-btn ${activeEmotion === emotion.type ? 'active' : ''}`}
            style={{
              '--emotion-start': emotion.colorStart,
              '--emotion-end': emotion.colorEnd
            } as React.CSSProperties}
            onClick={() => handleEmotionClick(emotion.type)}
          >
            <span className="emotion-emoji">{emotion.emoji}</span>
            <span className="emotion-label">{emotion.label}</span>
          </button>
        ))}
      </div>
      <div className="memo-input-wrapper">
        <textarea
          className="memo-input"
          placeholder="写下今天的心情..."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
        />
      </div>
      <div className="picker-actions">
        {selectedEmotion && (
          <button className="delete-btn" onClick={onDelete}>
            删除
          </button>
        )}
        <button
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={!activeEmotion}
        >
          确定
        </button>
      </div>
    </div>
  )
}
