import { useState, useEffect, useRef } from 'react'
import type { Card, MatchedSummary } from '../types'
import { EMOTION_EMOJI, EMOTION_SENTIMENT } from '../types'
import { useAppStore } from '../store'
import { api } from '../api'

interface Props {
  card: Card
  mode: 'thumbnail' | 'full'
  isNew?: boolean
  onClick?: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  const isYest = d.toDateString() === yest.toDateString()
  
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  
  if (sameDay) return `今天 ${hh}:${mm}`
  if (isYest) return `昨天 ${hh}:${mm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
}

const HANDWRITING_FONTS = [
  '"Ma Shan Zheng", "Kaiti", "STKaiti", cursive',
  '"ZCOOL KuaiLe", "Kaiti", cursive',
  '"ZCOOL XiaoWei", "Kaiti", cursive',
]

export default function CardItem({ card, mode, isNew = false, onClick }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryDisplay, setSummaryDisplay] = useState('')
  const [particles, setParticles] = useState<Particle[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [enlarged, setEnlarged] = useState(false)
  const [mounted, setMounted] = useState(false)
  const toggleLike = useAppStore(s => s.toggleLike)
  const particleIdRef = useRef(0)

  const isFull = mode === 'full' || enlarged
  const summaryFull = card.matchCount > 0
    ? `另有 ${card.matchCount} 位匿名用户也曾表达类似感受`
    : card.matchedSummaries.length > 0
    ? '找到了相似的思绪共鸣'
    : '正在寻找相似的回响...'

  useEffect(() => {
    if (!isFull && !isNew) return
    const timer = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(timer)
  }, [isFull, isNew])

  useEffect(() => {
    if (!isFull || !drawerOpen) {
      setSummaryDisplay('')
      return
    }
    if (summaryDisplay.length >= summaryFull.length) return

    let i = summaryDisplay.length
    const timer = window.setInterval(() => {
      i++
      setSummaryDisplay(summaryFull.slice(0, i))
      if (i >= summaryFull.length) clearInterval(timer)
    }, 35)
    return () => clearInterval(timer)
  }, [isFull, drawerOpen, summaryFull, card.matchCount, card.matchedSummaries.length])

  function spawnParticles(clientX: number, clientY: number, container: HTMLElement) {
    const rect = container.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top

    const colors = ['#f87171', '#fb7185', '#f472b6', '#fda4af', '#fecdd3']
    const newParticles: Particle[] = []

    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4
      const speed = 2 + Math.random() * 4
      newParticles.push({
        id: particleIdRef.current++,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    setParticles(prev => [...prev, ...newParticles])

    let frame = 0
    const totalFrames = 45
    function animate() {
      frame++
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            life: 1 - frame / totalFrames,
          }))
          .filter(p => p.life > 0)
      )
      if (frame < totalFrames) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }

  async function handleLike(e: React.MouseEvent, summaryId: string) {
    e.stopPropagation()
    if (likedIds.has(summaryId)) return
    setLikedIds(prev => new Set(prev).add(summaryId))
    toggleLike(summaryId, card.id)
    const btn = e.currentTarget as HTMLElement
    spawnParticles(e.clientX, e.clientY, btn.closest('.card-container') as HTMLElement)
    try {
      await api.likeCard(summaryId)
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  const sentiment = EMOTION_SENTIMENT[card.emotion]
  const accentColor =
    sentiment === 'positive' ? 'rgba(74, 222, 128,' :
    sentiment === 'negative' ? 'rgba(248, 113, 113,' :
    'rgba(148, 163, 184,'

  const fontStyle = HANDWRITING_FONTS[card.id.charCodeAt(card.id.length - 1) % HANDWRITING_FONTS.length]

  if (mode === 'thumbnail') {
    return (
      <div
        onClick={() => { setEnlarged(true); onClick?.() }}
        className="card-container"
        style={{
          position: 'relative',
          borderRadius: 18,
          padding: 18,
          background: 'rgba(30, 27, 75, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          cursor: 'pointer',
          transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          breakInside: 'avoid',
          marginBottom: 16,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.borderColor = `${accentColor} 0.3)`
          e.currentTarget.style.boxShadow = `0 12px 40px ${accentColor} 0.12)`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.55)' }}>{formatDate(card.timestamp)}</span>
          <span style={{ fontSize: 18 }}>{EMOTION_EMOJI[card.emotion]}</span>
        </div>
        <p style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: 'rgba(255, 255, 255, 0.82)',
          display: '-webkit-box',
          WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: fontStyle,
        }}>
          {card.text}
        </p>
        {card.matchCount > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
            <span style={{ fontSize: 11, color: 'rgba(168, 139, 250, 0.7)' }}>
              ♡ {card.matchCount} 次共鸣
            </span>
          </div>
        )}
      </div>
    )
  }

  const displaySummary = drawerOpen ? summaryDisplay : summaryFull.slice(0, Math.min(summaryFull.length, 28)) + (summaryFull.length > 28 && !drawerOpen ? '...' : '')

  return (
    <>
      <div
        className="card-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          borderRadius: 28,
          padding: 28,
          background: 'rgba(30, 27, 75, 0.45)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: `1px solid ${accentColor} 0.18)`,
          boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 80px ${accentColor} 0.06)`,
          opacity: mounted ? 1 : 0,
          transform: mounted ? (isNew ? 'translateY(0)' : 'translateY(0)') : (isNew ? 'translateY(120px)' : 'scale(0.9)'),
          transition: mode === 'full'
            ? 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'visible',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12,
              color: 'rgba(148, 163, 184, 0.55)',
              letterSpacing: 0.5,
            }}>
              {formatDate(card.timestamp)}
            </span>
            <span style={{
              fontSize: 20,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
            }}>
              {EMOTION_EMOJI[card.emotion]}
            </span>
          </div>
          {enlarged && (
            <button
              onClick={() => setEnlarged(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 20,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(15, 23, 42, 0.4)',
                color: 'rgba(203, 213, 225, 0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)'
                e.currentTarget.style.color = 'rgba(203, 213, 225, 0.7)'
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{
          minHeight: enlarged ? 120 : 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 4px 28px',
        }}>
          <p style={{
            fontSize: enlarged ? 22 : 19,
            lineHeight: 1.9,
            color: 'rgba(255, 255, 255, 0.96)',
            fontFamily: fontStyle,
            fontWeight: 300,
            letterSpacing: 0.8,
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textShadow: '0 2px 20px rgba(168, 139, 250, 0.15)',
          }}>
            {card.text}
          </p>
        </div>

        <div style={{
          marginTop: 'auto',
          paddingTop: 20,
          borderTop: '1px solid rgba(148, 163, 184, 0.08)',
          textAlign: 'center',
        }}>
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (card.matchedSummaries.length > 0 || card.matchCount > 0) {
                setDrawerOpen(prev => !prev)
              }
            }}
            style={{
              display: 'inline-block',
              fontSize: 12.5,
              color: card.matchedSummaries.length > 0 || card.matchCount > 0
                ? 'rgba(216, 180, 254, 0.95)'
                : 'rgba(148, 163, 184, 0.4)',
              cursor: (card.matchedSummaries.length > 0 || card.matchCount > 0) ? 'pointer' : 'default',
              letterSpacing: 0.6,
              transition: 'color 0.25s',
              padding: '6px 14px',
              borderRadius: 20,
              background: card.matchedSummaries.length > 0 || card.matchCount > 0
                ? 'rgba(168, 139, 250, 0.08)'
                : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (card.matchedSummaries.length > 0 || card.matchCount > 0) {
                e.currentTarget.style.color = 'rgba(233, 213, 255, 1)'
                e.currentTarget.style.background = 'rgba(168, 139, 250, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = card.matchedSummaries.length > 0 || card.matchCount > 0
                ? 'rgba(216, 180, 254, 0.95)'
                : 'rgba(148, 163, 184, 0.4)'
              e.currentTarget.style.background = card.matchedSummaries.length > 0 || card.matchCount > 0
                ? 'rgba(168, 139, 250, 0.08)'
                : 'transparent'
            }}
          >
            {displaySummary}
            <span style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              marginLeft: 8,
              borderRadius: '50%',
              background: card.matchedSummaries.length > 0 || card.matchCount > 0
                ? 'rgba(168, 139, 250, 0.9)'
                : 'rgba(148, 163, 184, 0.3)',
              animation: (card.matchedSummaries.length > 0 || card.matchCount > 0) ? 'pulseDot 2s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 100,
        }}>
          {particles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: p.color,
                opacity: p.life,
                transform: `scale(${p.life})`,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
            />
          ))}
        </div>
      </div>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: enlarged ? 'fixed' : 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '28px 24px 40px',
              background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.95))',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderTop: '1px solid rgba(168, 139, 250, 0.15)',
              boxShadow: '0 -20px 80px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{
              width: 44,
              height: 5,
              borderRadius: 3,
              background: 'rgba(148, 163, 184, 0.35)',
              margin: '0 auto 24px',
            }} />
            <h3 style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'rgba(216, 180, 254, 0.95)',
              textAlign: 'center',
              marginBottom: 24,
              letterSpacing: 2,
            }}>
              ✦ 匿名回响 ✦
            </h3>
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              {card.matchedSummaries.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(148, 163, 184, 0.5)',
                  fontSize: 13,
                }}>
                  正在远方搜寻相似的灵魂...
                </div>
              ) : (
                card.matchedSummaries.map((summary, idx) => (
                  <MatchedItem
                    key={summary.id}
                    summary={summary}
                    idx={idx}
                    liked={likedIds.has(summary.id)}
                    onLike={(e) => handleLike(e, summary.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {enlarged && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.35s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              animation: 'zoomIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'scale(1.08)',
            }}
          >
            <CardItem card={card} mode="full" onClick={() => setEnlarged(false)} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.08); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

function MatchedItem({
  summary,
  idx,
  liked,
  onLike,
}: {
  summary: MatchedSummary
  idx: number
  liked: boolean
  onLike: (e: React.MouseEvent) => void
}) {
  const avatarColors = [
    ['#8b5cf6', '#6366f1'],
    ['#ec4899', '#8b5cf6'],
    ['#10b981', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
    ['#06b6d4', '#3b82f6'],
  ]
  const colorPair = avatarColors[idx % avatarColors.length]

  return (
    <div style={{
      display: 'flex',
      gap: 14,
      padding: '18px 18px',
      marginBottom: 12,
      borderRadius: 18,
      background: 'rgba(15, 23, 42, 0.35)',
      border: '1px solid rgba(148, 163, 184, 0.08)',
      alignItems: 'flex-start',
      animation: `itemIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.1}s both`,
    }}>
      <div style={{
        flexShrink: 0,
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        boxShadow: `0 4px 16px ${colorPair[0]}40`,
      }}>
        {EMOTION_EMOJI[summary.emotion]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: 'rgba(226, 232, 240, 0.9)',
          wordBreak: 'break-word',
          marginBottom: 10,
        }}>
          {summary.text}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.4)' }}>
            {formatDate(summary.timestamp)}
          </span>
          <button
            onClick={onLike}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              border: liked ? '1px solid rgba(248, 113, 113, 0.4)' : '1px solid rgba(148, 163, 184, 0.12)',
              background: liked ? 'rgba(248, 113, 113, 0.12)' : 'rgba(15, 23, 42, 0.3)',
              cursor: liked ? 'default' : 'pointer',
              color: liked ? 'rgba(252, 165, 165, 0.95)' : 'rgba(148, 163, 184, 0.6)',
              fontSize: 12,
              transition: 'all 0.25s',
            }}
            onMouseEnter={(e) => {
              if (!liked) {
                e.currentTarget.style.color = 'rgba(252, 165, 165, 0.9)'
                e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!liked) {
                e.currentTarget.style.color = 'rgba(148, 163, 184, 0.6)'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)'
              }
            }}
          >
            <HeartIcon filled={liked} />
            {summary.likes + (liked ? 1 : 0)}
          </button>
        </div>
      </div>
    </div>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#f87171' : 'none'}
      stroke={filled ? '#f87171' : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        transform: filled ? 'scale(1.2)' : 'scale(1)',
      }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
