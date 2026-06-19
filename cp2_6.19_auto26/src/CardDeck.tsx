import { useState, useMemo } from 'react'
import type { Deck } from './App'

interface CardDeckProps {
  decks: Deck[]
  onSelect: (deckId: string) => void
}

const CardDeck = ({ decks, onSelect }: CardDeckProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const groupedCards = useMemo(() => {
    const map: Record<string, { easy: number; medium: number; hard: number }> = {}
    for (const deck of decks) {
      let easy = 0
      let medium = 0
      let hard = 0
      for (const card of deck.cards) {
        if (card.difficulty >= 2) easy++
        else if (card.difficulty === 1) medium++
        else hard++
      }
      map[deck.id] = { easy, medium, hard }
    }
    return map
  }, [decks])

  const getDueCount = (deck: Deck) => {
    const now = Date.now()
    return deck.cards.filter((c) => c.dueDate <= now).length
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 22, fontWeight: 700 }}>我的卡组</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          选择一个卡组开始复习，智能算法将根据你的记忆情况安排复习计划
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {decks.map((deck) => {
          const group = groupedCards[deck.id]
          const dueCount = getDueCount(deck)
          const isHovered = hoveredId === deck.id
          const totalCards = deck.cards.length

          return (
            <div
              key={deck.id}
              onClick={() => onSelect(deck.id)}
              onMouseEnter={() => setHoveredId(deck.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'relative',
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                border: '1px solid var(--border)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered
                  ? '0 12px 32px var(--shadow)'
                  : '0 2px 8px var(--shadow)',
                overflow: 'hidden',
                background: isHovered
                  ? 'color-mix(in srgb, var(--bg-card) 90%, var(--accent) 10%)'
                  : 'var(--bg-card)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: isHovered ? 4 : 0,
                  background: deck.color,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${deck.color}, ${deck.color}99)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: '#fff',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  📖
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {deck.name}
                    </h3>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: isHovered ? deck.color : 'var(--text-secondary)',
                        transition: 'color 0.3s ease',
                        flexShrink: 0,
                      }}
                    >
                      ({totalCards}张)
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '2px 0 0 0',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {totalCards} 张卡片
                  </p>
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  minHeight: 36,
                }}
              >
                {deck.description}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: 'rgba(82,196,26,0.12)',
                    color: '#52c41a',
                  }}
                >
                  已掌握 {group.easy}
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: 'rgba(250,173,20,0.12)',
                    color: '#faad14',
                  }}
                >
                  学习中 {group.medium}
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: 'rgba(255,77,79,0.12)',
                    color: '#ff4d4f',
                  }}
                >
                  待学习 {group.hard}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {dueCount > 0 ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {dueCount} 张待复习
                    </span>
                  ) : (
                    <span>暂无待复习</span>
                  )}
                </div>
                <span
                  style={{
                    color: 'var(--accent)',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'transform 0.2s',
                    transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                    display: 'inline-block',
                  }}
                >
                  开始复习 →
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CardDeck
