import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import CardItem from './CardItem'

export default function CardHistory() {
  const filteredCards = useAppStore(s => s.filteredCards)
  const cards = useAppStore(s => s.cards)
  const searchQuery = useAppStore(s => s.searchQuery)
  const setSearchQuery = useAppStore(s => s.setSearchQuery)
  const [localQuery, setLocalQuery] = useState('')
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<number>()
  const prevIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(localQuery)
    }, 120)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [localQuery, setSearchQuery])

  useEffect(() => {
    const currentIds = new Set(filteredCards.map(c => c.id))
    const added = new Set<string>()
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) {
        added.add(id)
      }
    }
    if (added.size > 0) {
      setAnimatingIds(added)
      const t = setTimeout(() => setAnimatingIds(new Set()), 600)
      return () => clearTimeout(t)
    }
    prevIdsRef.current = currentIds
  }, [filteredCards])

  const displayCards = searchQuery.trim() ? filteredCards : cards

  return (
    <div style={{
      width: '100%',
      maxWidth: 1200,
      margin: '0 auto',
      padding: '100px 24px 80px',
      animation: 'pageFadeIn 0.5s ease',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 300,
          color: 'rgba(255, 255, 255, 0.92)',
          letterSpacing: 8,
          marginBottom: 12,
        }}>
          历史回响
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(148, 163, 184, 0.55)',
          letterSpacing: 2,
          marginBottom: 32,
        }}>
          时光之河中，那些你留下的涟漪
        </p>

        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          position: 'relative',
        }}>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="搜索记忆的碎片..."
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              borderRadius: 16,
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: 'rgba(30, 27, 75, 0.35)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 14,
              outline: 'none',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 139, 250, 0.4)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 139, 250, 0.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(148, 163, 184, 0.5)',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {localQuery && (
            <button
              onClick={() => setLocalQuery('')}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(148, 163, 184, 0.15)',
                color: 'rgba(203, 213, 225, 0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div style={{
            marginTop: 16,
            fontSize: 12,
            color: 'rgba(168, 139, 250, 0.8)',
            letterSpacing: 1,
          }}>
            找到 {filteredCards.length} 条相关回响
          </div>
        )}
      </div>

      {displayCards.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: 'rgba(148, 163, 184, 0.5)',
          fontSize: 14,
          letterSpacing: 1,
        }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.4 }}>💭</div>
          {searchQuery.trim()
            ? '没有找到匹配的记忆...'
            : '还没有留下任何回响，开始记录第一段思绪吧'}
        </div>
      ) : (
        <div
          style={{
            columnCount: 1,
            columnGap: 16,
          }}
        >
          <style>{`
            @media (min-width: 640px) { .history-grid { column-count: 2 !important; } }
            @media (min-width: 960px) { .history-grid { column-count: 3 !important; } }
            @keyframes cardFade {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pageFadeIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            input::placeholder {
              color: rgba(148, 163, 184, 0.35);
            }
          `}</style>
          <div className="history-grid" style={{ columnCount: 1, columnGap: 16 }}>
            {displayCards.map((card, i) => (
              <div
                key={card.id}
                style={{
                  animation: animatingIds.has(card.id) || i < 12
                    ? `cardFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i * 0.04, 0.5)}s both`
                    : undefined,
                }}
              >
                <CardItem card={card} mode="thumbnail" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
