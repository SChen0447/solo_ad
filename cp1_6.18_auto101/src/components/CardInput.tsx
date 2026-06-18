import { useState, useEffect, useRef, useMemo } from 'react'
import { useAppStore } from '../store'
import { api } from '../api'
import type { Emotion, Card } from '../types'
import { EMOTION_EMOJI, EMOTION_LABELS, EMOTION_SENTIMENT } from '../types'

const PLACEHOLDER_TEXTS = [
  '今天的心情是怎样的呢...',
  '记录此刻的思绪，让它在此回响...',
  '写下你心中的感受，匿名的安全港为你守候...',
  '有些话，说出来就会好一些...',
]

const POSITIVE_WORDS = ['开心', '快乐', '高兴', '幸福', '棒', '好', '喜欢', '爱', '美', '棒', '笑', '希望', '期待', '满足', '平静', '放松', '愉快']
const NEGATIVE_WORDS = ['难过', '伤心', '悲伤', '痛苦', '压力', '焦虑', '害怕', '生气', '愤怒', '讨厌', '恨', '累', '烦', '哭', '孤独', '绝望', '失落']

interface Props {
  onSubmitted: (card: Card) => void
}

export default function CardInput({ onSubmitted }: Props) {
  const [text, setText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null)
  const [placeholder, setPlaceholder] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const addCard = useAppStore(s => s.addCard)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const currentText = PLACEHOLDER_TEXTS[placeholderIdx]
    let i = 0
    let timer: number

    function type() {
      if (i <= currentText.length) {
        setPlaceholder(currentText.slice(0, i))
        i++
        timer = window.setTimeout(type, 120)
      } else {
        timer = window.setTimeout(() => {
          setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length)
        }, 3500)
      }
    }

    type()
    return () => clearTimeout(timer)
  }, [placeholderIdx])

  useEffect(() => {
    if (!text.trim()) {
      setSentiment('neutral')
      return
    }
    const lower = text.toLowerCase()
    let posScore = 0
    let negScore = 0
    for (const w of POSITIVE_WORDS) {
      if (lower.includes(w)) posScore++
    }
    for (const w of NEGATIVE_WORDS) {
      if (lower.includes(w)) negScore++
    }
    if (posScore > negScore) setSentiment('positive')
    else if (negScore > posScore) setSentiment('negative')
    else setSentiment('neutral')
  }, [text])

  useEffect(() => {
    if (selectedEmotion && EMOTION_SENTIMENT[selectedEmotion] !== 'neutral') {
      setSentiment(EMOTION_SENTIMENT[selectedEmotion])
    }
  }, [selectedEmotion])

  const borderGlow = useMemo(() => {
    if (sentiment === 'positive') {
      return '0 0 0 1px rgba(74, 222, 128, 0.4), 0 0 30px rgba(74, 222, 128, 0.25), 0 0 60px rgba(74, 222, 128, 0.12)'
    } else if (sentiment === 'negative') {
      return '0 0 0 1px rgba(248, 113, 113, 0.4), 0 0 30px rgba(248, 113, 113, 0.25), 0 0 60px rgba(248, 113, 113, 0.12)'
    }
    return '0 0 0 1px rgba(148, 163, 184, 0.2), 0 0 20px rgba(148, 163, 184, 0.08)'
  }, [sentiment])

  function handleEmotionSelect(emotion: Emotion) {
    setSelectedEmotion(prev => prev === emotion ? null : emotion)
  }

  async function handleSubmit() {
    if (!text.trim() || !selectedEmotion || isSubmitting) return

    setIsSubmitting(true)
    setIsCollapsing(true)

    try {
      const card = await api.createCard({ text: text.trim(), emotion: selectedEmotion })
      addCard(card)
      onSubmitted(card)

      setTimeout(() => {
        setText('')
        setSelectedEmotion(null)
        setSentiment('neutral')
        setIsCollapsing(false)
        setIsSubmitting(false)
      }, 700)
    } catch (e) {
      console.error('Submit failed:', e)
      setIsSubmitting(false)
      setIsCollapsing(false)
    }
  }

  const canSubmit = text.trim().length > 0 && selectedEmotion && !isSubmitting

  const emotions: Emotion[] = ['happy', 'sad', 'anxious', 'angry', 'calm', 'hopeful']

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 620,
        margin: '0 auto',
        padding: '0 24px',
        transform: isCollapsing ? 'translateY(-120%) scale(0.8)' : 'translateY(0) scale(1)',
        opacity: isCollapsing ? 0 : 1,
        transition: 'transform 0.6s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.5s ease',
        pointerEvents: isCollapsing ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 24,
          padding: selectedEmotion ? '48px 28px 28px' : '28px',
          background: 'rgba(30, 27, 75, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: borderGlow,
          transition: 'box-shadow 0.5s ease, padding 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
          transform: 'scale(1)',
          animation: 'softPulse 4s ease-in-out infinite',
        }}
      >
        {selectedEmotion && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              fontSize: 26,
              animation: 'emotionBounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          >
            {EMOTION_EMOJI[selectedEmotion]}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={300}
          style={{
            width: '100%',
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'rgba(255, 255, 255, 0.92)',
            fontSize: 17,
            lineHeight: 1.7,
            letterSpacing: 0.3,
            fontFamily: 'inherit',
            caretColor: 'rgba(168, 139, 250, 0.9)',
          }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          fontSize: 12,
          color: 'rgba(148, 163, 184, 0.5)',
          marginBottom: 4,
        }}>
          <span>{text.length} / 300</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 10,
          marginTop: 20,
        }}>
          {emotions.map((emotion) => {
            const active = selectedEmotion === emotion
            return (
              <button
                key={emotion}
                onClick={() => handleEmotionSelect(emotion)}
                title={EMOTION_LABELS[emotion]}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 16,
                  border: active
                    ? '1px solid rgba(168, 139, 250, 0.6)'
                    : '1px solid rgba(148, 163, 184, 0.12)',
                  background: active
                    ? 'rgba(168, 139, 250, 0.18)'
                    : 'rgba(15, 23, 42, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: active ? '0 4px 20px rgba(168, 139, 250, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.transform = 'scale(1.06)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <span style={{ fontSize: 22 }}>{EMOTION_EMOJI[emotion]}</span>
                <span style={{
                  fontSize: 10,
                  color: active ? 'rgba(216, 180, 254, 0.95)' : 'rgba(148, 163, 184, 0.6)',
                  transition: 'color 0.25s',
                }}>
                  {EMOTION_LABELS[emotion]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: 'none',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 2,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.85))'
              : 'rgba(71, 85, 105, 0.3)',
            color: canSubmit ? 'white' : 'rgba(148, 163, 184, 0.4)',
            transition: 'all 0.3s ease',
            boxShadow: canSubmit
              ? '0 8px 30px rgba(139, 92, 246, 0.35)'
              : 'none',
            transform: canSubmit ? 'translateY(0)' : 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (canSubmit) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.45)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = canSubmit
              ? '0 8px 30px rgba(139, 92, 246, 0.35)'
              : 'none'
          }}
        >
          {isSubmitting ? '正在回响...' : '释放思绪'}
        </button>
      </div>

      <style>{`
        @keyframes softPulse {
          0%, 100% { box-shadow: ${borderGlow}; }
          50% { box-shadow: ${sentiment === 'positive'
            ? '0 0 0 1px rgba(74, 222, 128, 0.5), 0 0 40px rgba(74, 222, 128, 0.3), 0 0 80px rgba(74, 222, 128, 0.15)'
            : sentiment === 'negative'
            ? '0 0 0 1px rgba(248, 113, 113, 0.5), 0 0 40px rgba(248, 113, 113, 0.3), 0 0 80px rgba(248, 113, 113, 0.15)'
            : '0 0 0 1px rgba(148, 163, 184, 0.25), 0 0 30px rgba(148, 163, 184, 0.12)'}; }
        }
        @keyframes emotionBounce {
          0% { transform: translateY(40px) scale(0.5); opacity: 0; }
          50% { transform: translateY(-8px) scale(1.15); }
          70% { transform: translateY(4px) scale(0.95); }
          85% { transform: translateY(-2px) scale(1.02); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        textarea::placeholder {
          color: rgba(148, 163, 184, 0.35);
        }
      `}</style>
    </div>
  )
}
