import React, { useState, useRef } from 'react'

interface KeywordInputProps {
  onSubmit: (keyword: string, inputRef: HTMLInputElement) => void
  disabled?: boolean
}

const SendIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const RocketIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const KeywordInput: React.FC<KeywordInputProps> = ({ onSubmit, disabled }) => {
  const [keyword, setKeyword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [rocketVisible, setRocketVisible] = useState(false)
  const [rocketPos, setRocketPos] = useState({ x: 0, y: 0 })

  const handleSubmit = () => {
    const trimmed = keyword.trim().slice(0, 10)
    if (!trimmed || disabled || !inputRef.current) return

    const input = inputRef.current
    const rect = input.getBoundingClientRect()
    const containerRect = input.closest('.canvas-section')?.getBoundingClientRect()

    if (containerRect) {
      setRocketPos({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top
      })
      setRocketVisible(true)

      setTimeout(() => setRocketVisible(false), 500)
    }

    onSubmit(trimmed, input)
    setKeyword('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="student-input-bar">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          className="text-input"
          type="text"
          placeholder="输入关键词（最多10字）..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value.slice(0, 10))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={10}
        />
        <span className="char-count">{keyword.length}/10</span>
      </div>
      <button
        className="btn"
        onClick={handleSubmit}
        disabled={!keyword.trim() || disabled}
        style={{ flex: '0 0 auto', padding: '12px 20px' }}
      >
        <SendIcon />
        发送
      </button>

      {rocketVisible && (
        <div
          className="rocket-container"
          style={{
            left: rocketPos.x - 12,
            top: rocketPos.y - 12,
            animation: 'rocketFly 0.5s ease-out forwards'
          }}
        >
          <RocketIcon style={{ color: 'var(--primary)' }} />
        </div>
      )}

      <style>{`
        @keyframes rocketFly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(50vw - 100%), -60vh) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default KeywordInput
