import { useEffect, useState, useRef } from 'react'
import { eventBus } from '../../shared/eventBus'
import { dataStore, type Capsule, type MoodType } from '../../shared/dataStore'
import { confettiEffect } from '../../utils/confettiEffect'

const MOOD_INFO: Record<MoodType, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '😊', color: '#FBBF24', label: '开心' },
  calm: { emoji: '😌', color: '#60A5FA', label: '平静' },
  sad: { emoji: '😢', color: '#818CF8', label: '伤感' },
  angry: { emoji: '😠', color: '#F87171', label: '愤怒' },
  tired: { emoji: '😴', color: '#A78BFA', label: '疲惫' }
}

export function ReminderPopup() {
  const [currentCapsule, setCurrentCapsule] = useState<Capsule | null>(null)
  const [queue, setQueue] = useState<Capsule[]>([])
  const [isClosing, setIsClosing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = eventBus.on('capsule-due', (capsule) => {
      setQueue((prev) => [...prev, capsule])
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!currentCapsule && queue.length > 0) {
      setCurrentCapsule(queue[0])
      setQueue((prev) => prev.slice(1))
    }
  }, [currentCapsule, queue])

  if (!currentCapsule) return null

  const mood = MOOD_INFO[currentCapsule.mood]

  function handleClose() {
    setIsClosing(true)
    if (containerRef.current) {
      confettiEffect(containerRef.current)
    }
    dataStore.markAsOpened(currentCapsule.id)
    setTimeout(() => {
      setIsClosing(false)
      setCurrentCapsule(null)
    }, 500)
  }

  return (
    <>
      <div
        style={{
          ...styles.overlay,
          opacity: isClosing ? 0 : 1,
          transition: 'opacity 0.5s ease'
        }}
      />
      <div
        ref={containerRef}
        style={{
          ...styles.popup,
          opacity: isClosing ? 0 : 1,
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.5s ease, transform 0.5s ease'
        }}
      >
        <div style={{
          ...styles.gradientBorder,
          background: 'linear-gradient(135deg, #7C3AED, #A78BFA, #6D28D9)'
        }}>
          <div style={styles.popupInner}>
            <h2 style={styles.popupTitle}>{currentCapsule.title}</h2>

            {currentCapsule.imageUrl && (
              <img
                src={currentCapsule.imageUrl}
                alt={currentCapsule.title}
                style={styles.popupImage}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}

            <div style={styles.contentArea}>
              <p style={styles.popupContent}>{currentCapsule.content}</p>
            </div>

            <div style={styles.moodSection}>
              <span style={{ ...styles.moodDisplay, backgroundColor: mood.color + '15' }}>
                <span style={{
                  ...styles.moodEmoji,
                  animation: 'moodPulse 0.5s ease-in-out infinite'
                }}>
                  {mood.emoji}
                </span>
                <span style={{ color: mood.color, fontSize: 13, fontWeight: 500 }}>
                  {mood.label}
                </span>
              </span>
            </div>

            <div style={styles.footer}>
              <span style={styles.dateText}>
                封存于 {new Date(currentCapsule.createdAt).toLocaleDateString('zh-CN')}
              </span>
              <button style={styles.confirmBtn} onClick={handleClose}>
                确认已阅 ✓
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes moodPulse {
            0%, 100% { transform: scale(1.0); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 9998
  },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(1)',
    zIndex: 9999,
    width: 500,
    maxWidth: '92vw'
  },
  gradientBorder: {
    borderRadius: 24,
    padding: 4
  },
  popupInner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    height: 400,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1F2937',
    margin: '0 0 12px 0'
  },
  popupImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
    borderRadius: 10,
    marginBottom: 12
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: 12,
    paddingRight: 4
  },
  popupContent: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#374151',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  moodSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 12
  },
  moodDisplay: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 999
  },
  moodEmoji: {
    fontSize: 24,
    display: 'inline-block'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 12
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280'
  },
  confirmBtn: {
    width: 160,
    height: 44,
    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 22,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s ease'
  }
}
