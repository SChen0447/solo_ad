import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from './store'
import { api, subscribeMatched } from './api'
import CardInput from './components/CardInput'
import CardItem from './components/CardItem'
import CardHistory from './components/CardHistory'
import type { Card } from './types'

type Page = 'home' | 'history'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [newestCard, setNewestCard] = useState<Card | null>(null)
  const [showInput, setShowInput] = useState(true)
  const [appReady, setAppReady] = useState(false)
  const { cards, setCards, updateMatchedSummaries } = useAppStore()

  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 1300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    api.getCards()
      .then(data => {
        const filtered = data.filter(c => !c.id.startsWith('mock-') || cards.length === 0)
        setCards(cards.length === 0 ? data : [
          ...cards,
          ...filtered.filter(c => !cards.some(existing => existing.id === c.id))
        ])
      })
      .catch(e => console.error('Failed to load cards:', e))
  }, [])

  useEffect(() => {
    const unsub = subscribeMatched(({ cardId, matchedSummaries, matchCount }) => {
      updateMatchedSummaries(cardId, matchedSummaries, matchCount)
    })
    return unsub
  }, [updateMatchedSummaries])

  const navigateTo = useCallback((target: Page) => {
    if (target === page || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setPage(target)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 350)
  }, [page, isTransitioning])

  const handleSubmitted = useCallback((card: Card) => {
    setShowInput(false)
    setNewestCard(card)
    setTimeout(() => {
      setShowInput(true)
    }, 1500)
  }, [])

  if (!appReady) return null

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 24px',
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div
            onClick={() => navigateTo('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <LogoIcon />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: 17,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.92)',
                letterSpacing: 6,
              }}>
                思维回响
              </span>
              <span style={{
                fontSize: 9.5,
                color: 'rgba(148, 163, 184, 0.45)',
                letterSpacing: 3,
                marginTop: 2,
              }}>
                MIND · ECHO
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: 6 }}>
            <NavButton
              active={page === 'home'}
              onClick={() => navigateTo('home')}
            >
              此刻
            </NavButton>
            <NavButton
              active={page === 'history'}
              onClick={() => navigateTo('history')}
            >
              历史回响
            </NavButton>
          </nav>
        </div>
      </div>

      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity, transform',
        }}
      >
        {page === 'home' && (
          <HomePage
            showInput={showInput}
            newestCard={newestCard}
            onSubmitted={handleSubmitted}
          />
        )}
        {page === 'history' && <CardHistory />}
      </div>
    </div>
  )
}

function HomePage({
  showInput,
  newestCard,
  onSubmitted,
}: {
  showInput: boolean
  newestCard: Card | null
  onSubmitted: (card: Card) => void
}) {
  const cards = useAppStore(s => s.cards)
  const userCards = cards.filter(c => !c.id.startsWith('mock-'))

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '140px 0 120px',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 48,
        padding: '0 24px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 18px',
          borderRadius: 20,
          background: 'rgba(168, 139, 250, 0.08)',
          border: '1px solid rgba(168, 139, 250, 0.15)',
          marginBottom: 24,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 10px #4ade80',
            animation: 'livePulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11.5,
            color: 'rgba(216, 180, 254, 0.9)',
            letterSpacing: 2,
          }}>
            {cards.length} 条思绪正在回响
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 200,
          color: 'rgba(255, 255, 255, 0.95)',
          letterSpacing: 'clamp(0.3em, 0.1em, 0.5em)',
          marginBottom: 16,
          lineHeight: 1.4,
        }}>
          释放此刻的自己
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(148, 163, 184, 0.55)',
          letterSpacing: 3,
          maxWidth: 480,
          margin: '0 auto',
          lineHeight: 1.8,
        }}>
          在匿名的港湾中倾诉，与远方相似的灵魂温柔共鸣
        </p>
      </div>

      {showInput && (
        <CardInput onSubmitted={onSubmitted} />
      )}

      {newestCard && (
        <div style={{
          marginTop: showInput ? 0 : 60,
          padding: '0 24px',
          willChange: 'transform, opacity',
        }}>
          <CardItem card={newestCard} mode="full" isNew />
        </div>
      )}

      {!newestCard && userCards.length > 0 && (
        <div style={{
          marginTop: 80,
          padding: '0 24px',
        }}>
          <div style={{
            maxWidth: 560,
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2))' }} />
            <span style={{
              fontSize: 11,
              color: 'rgba(148, 163, 184, 0.4)',
              letterSpacing: 4,
            }}>
              最近的回响
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.2), transparent)' }} />
          </div>
          <CardItem card={userCards[0]} mode="full" />
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px',
        borderRadius: 12,
        border: active ? '1px solid rgba(168, 139, 250, 0.3)' : '1px solid transparent',
        background: active ? 'rgba(168, 139, 250, 0.12)' : 'transparent',
        color: active ? 'rgba(233, 213, 255, 0.98)' : 'rgba(148, 163, 184, 0.65)',
        fontSize: 13,
        letterSpacing: 2,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.3s ease',
        fontWeight: active ? 400 : 300,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'rgba(226, 232, 240, 0.85)'
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.06)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'rgba(148, 163, 184, 0.65)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {children}
    </button>
  )
}

function LogoIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#logoGlow)">
        <path
          d="M10 24 Q10 14 16 14 Q20 14 20 24 Q20 34 24 34 Q28 34 28 24 Q28 14 32 14 Q38 14 38 24"
          stroke="url(#logoGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: 120,
            strokeDashoffset: 0,
            animation: 'waveDraw 1.8s ease-out forwards',
          }}
        />
        <path
          d="M24 31 C21 27, 17 27, 17 22 C17 18, 21 16, 24 20 C27 16, 31 18, 31 22 C31 27, 27 27, 24 31Z"
          fill="url(#logoGrad)"
          style={{
            opacity: 0,
            animation: 'heartFade 0.8s ease-out 1.2s forwards',
          }}
        />
      </g>
      <style>{`
        @keyframes waveDraw {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes heartFade {
          from { opacity: 0; transform: scale(0.6); transform-origin: center; }
          to { opacity: 1; transform: scale(1); transform-origin: center; }
        }
      `}</style>
    </svg>
  )
}
