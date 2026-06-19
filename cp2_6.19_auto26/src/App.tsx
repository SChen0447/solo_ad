import { useState, useEffect, useMemo, useCallback } from 'react'
import CardDeck from './CardDeck'
import ReviewSession from './ReviewSession'
import StatsPanel from './StatsPanel'

export interface Card {
  id: string
  front: string
  back: string
  example: string
  difficulty: number
  interval: number
  repetition: number
  efactor: number
  dueDate: number
  lastReview: number | null
}

export interface Deck {
  id: string
  name: string
  description: string
  cards: Card[]
  color: string
}

export interface Stats {
  todayReviewed: number
  streak: number
  lastStudyDate: string | null
  history: { date: string; count: number }[]
  totalMastered: number
  totalCards: number
}

type View = 'decks' | 'review' | 'stats'

const STORAGE_KEY = 'flashcard-app-data'

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const createSampleData = (): { decks: Deck[]; stats: Stats } => {
  const now = Date.now()
  const yesterday = now - 24 * 60 * 60 * 1000
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

  const decks: Deck[] = [
    {
      id: 'd1',
      name: 'CET-4 核心词汇',
      description: '大学英语四级核心高频单词，共3500词',
      color: '#4f8ef7',
      cards: [
        {
          id: 'c1',
          front: 'abandon',
          back: 'v. 放弃，抛弃',
          example: 'He abandoned his car in the snow.',
          difficulty: 0,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
        {
          id: 'c2',
          front: 'ability',
          back: 'n. 能力，才能',
          example: 'She has the ability to solve complex problems.',
          difficulty: 1,
          interval: 3,
          repetition: 2,
          efactor: 2.6,
          dueDate: now,
          lastReview: yesterday,
        },
        {
          id: 'c3',
          front: 'absorb',
          back: 'v. 吸收，吸引',
          example: 'Plants absorb carbon dioxide from the air.',
          difficulty: 2,
          interval: 7,
          repetition: 4,
          efactor: 2.8,
          dueDate: now + 24 * 60 * 60 * 1000,
          lastReview: twoDaysAgo,
        },
        {
          id: 'c4',
          front: 'abstract',
          back: 'adj. 抽象的 n. 摘要',
          example: 'The concept is too abstract for children.',
          difficulty: 0,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
        {
          id: 'c5',
          front: 'abundant',
          back: 'adj. 丰富的，充裕的',
          example: 'The region has abundant natural resources.',
          difficulty: 1,
          interval: 1,
          repetition: 1,
          efactor: 2.5,
          dueDate: now,
          lastReview: yesterday,
        },
      ],
    },
    {
      id: 'd2',
      name: '考研英语词汇',
      description: '研究生入学考试高频词汇精选',
      color: '#52c41a',
      cards: [
        {
          id: 'c6',
          front: 'advocate',
          back: 'v. 提倡，拥护 n. 拥护者',
          example: 'Many experts advocate a balanced diet.',
          difficulty: 2,
          interval: 10,
          repetition: 5,
          efactor: 2.9,
          dueDate: now + 3 * 24 * 60 * 60 * 1000,
          lastReview: yesterday,
        },
        {
          id: 'c7',
          front: 'ambiguous',
          back: 'adj. 模棱两可的，含糊的',
          example: 'His answer was deliberately ambiguous.',
          difficulty: 0,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
        {
          id: 'c8',
          front: 'analyze',
          back: 'v. 分析，解析',
          example: 'We need to analyze the data carefully.',
          difficulty: 1,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
      ],
    },
    {
      id: 'd3',
      name: '商务英语',
      description: '职场与商务场景高频词汇',
      color: '#faad14',
      cards: [
        {
          id: 'c9',
          front: 'negotiate',
          back: 'v. 谈判，协商',
          example: 'They are negotiating a new contract.',
          difficulty: 1,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
        {
          id: 'c10',
          front: 'revenue',
          back: 'n. 收入，收益',
          example: 'The company reported record revenue.',
          difficulty: 0,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          dueDate: now,
          lastReview: null,
        },
      ],
    },
  ]

  const history: { date: string; count: number }[] = []
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
    history.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      count: Math.floor(Math.random() * 30) + 5,
    })
  }
  history[history.length - 1].count = 12

  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0)
  const totalMastered = decks.reduce(
    (sum, d) => sum + d.cards.filter((c) => c.repetition >= 3).length,
    0,
  )

  return {
    decks,
    stats: {
      todayReviewed: 12,
      streak: 7,
      lastStudyDate: formatDate(now),
      history,
      totalMastered,
      totalCards,
    },
  }
}

const loadFromStorage = (): { decks: Deck[]; stats: Stats } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return null
}

const App = () => {
  const initialData = loadFromStorage() ?? createSampleData()

  const [view, setView] = useState<View>('decks')
  const [decks, setDecks] = useState<Deck[]>(initialData.decks)
  const [stats, setStats] = useState<Stats>(initialData.stats)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ decks, stats }))
    } catch {
      // ignore
    }
  }, [decks, stats])

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  )

  const enterReview = useCallback((deckId: string) => {
    setSelectedDeckId(deckId)
    setView('review')
  }, [])

  const goBack = useCallback(() => {
    setView('decks')
    setSelectedDeckId(null)
  }, [])

  const updateCard = useCallback(
    (cardId: string, updatedCard: Card) => {
      setDecks((prev) =>
        prev.map((deck) =>
          deck.id === selectedDeckId
            ? {
                ...deck,
                cards: deck.cards.map((c) =>
                  c.id === cardId ? updatedCard : c,
                ),
              }
            : deck,
        ),
      )
    },
    [selectedDeckId],
  )

  const incrementReviewStats = useCallback(() => {
    setStats((prev) => {
      const now = Date.now()
      const today = formatDate(now)
      let newHistory = [...prev.history]

      if (newHistory.length === 0 || newHistory[newHistory.length - 1].date !== today) {
        newHistory.push({ date: today, count: 1 })
        if (newHistory.length > 10) newHistory = newHistory.slice(-10)
      } else {
        newHistory[newHistory.length - 1] = {
          ...newHistory[newHistory.length - 1],
          count: newHistory[newHistory.length - 1].count + 1,
        }
      }

      let newStreak = prev.streak
      if (prev.lastStudyDate !== today) {
        const yesterday = formatDate(now - 24 * 60 * 60 * 1000)
        if (prev.lastStudyDate === yesterday || prev.lastStudyDate === null) {
          newStreak = prev.streak + 1
        } else {
          newStreak = 1
        }
      }

      return {
        ...prev,
        todayReviewed: prev.todayReviewed + 1,
        streak: newStreak,
        lastStudyDate: today,
        history: newHistory,
      }
    })
  }, [])

  const totalMasteredCount = useMemo(
    () => decks.reduce((sum, d) => sum + d.cards.filter((c) => c.repetition >= 3).length, 0),
    [decks],
  )
  const totalCardCount = useMemo(
    () => decks.reduce((sum, d) => sum + d.cards.length, 0),
    [decks],
  )

  const handleReviewResult = useCallback(
    (cardId: string, quality: 0 | 1 | 2) => {
      const card = selectedDeck?.cards.find((c) => c.id === cardId)
      if (!card) return

      let { interval, repetition, efactor } = card

      if (quality < 1) {
        repetition = 0
        interval = 1
      } else {
        if (repetition === 0) {
          interval = 1
        } else if (repetition === 1) {
          interval = 6
        } else {
          interval = Math.round(interval * efactor)
        }
        repetition += 1
      }

      efactor = efactor + (0.1 - (2 - quality) * (0.08 + (2 - quality) * 0.02))
      if (efactor < 1.3) efactor = 1.3

      const difficulty = repetition >= 5 ? 2 : repetition >= 2 ? 1 : 0
      const now = Date.now()
      const dueDate = now + interval * 24 * 60 * 60 * 1000

      const updated: Card = {
        ...card,
        interval,
        repetition,
        efactor,
        difficulty,
        dueDate,
        lastReview: now,
      }

      updateCard(cardId, updated)
      incrementReviewStats()
    },
    [selectedDeck, updateCard, incrementReviewStats],
  )

  const effectiveStats: Stats = {
    ...stats,
    totalMastered: totalMasteredCount,
    totalCards: totalCardCount,
  }

  const themeVars = isDark
    ? {
        '--bg-primary': '#1a1a2e',
        '--bg-secondary': '#252540',
        '--bg-card': '#2d2d4a',
        '--text-primary': '#e4e4f0',
        '--text-secondary': '#9898b0',
        '--text-accent': '#6fb1ff',
        '--accent': '#4f8ef7',
        '--accent-light': '#6fb1ff',
        '--border': '#3a3a5c',
        '--shadow': 'rgba(0,0,0,0.4)',
        '--card-gradient-start': '#2d3748',
        '--card-gradient-end': '#1a202c',
        '--card-front-text': '#6fb1ff',
      }
    : {
        '--bg-primary': '#f5f9ff',
        '--bg-secondary': '#ffffff',
        '--bg-card': '#ffffff',
        '--text-primary': '#1a2b4a',
        '--text-secondary': '#64748b',
        '--text-accent': '#4f8ef7',
        '--accent': '#4f8ef7',
        '--accent-light': '#79a9ff',
        '--border': '#e2e8f0',
        '--shadow': 'rgba(79,142,247,0.15)',
        '--card-gradient-start': '#4f8ef7',
        '--card-gradient-end': '#6fb1ff',
        '--card-front-text': '#ffffff',
      }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background 0.3s, color 0.3s',
        ...(themeVars as React.CSSProperties),
      }}
    >
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {view !== 'decks' && (
            <button
              onClick={goBack}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                width: 36,
                height: 36,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
            >
              ←
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {view === 'decks' && '📚 单词闪卡'}
            {view === 'review' && selectedDeck?.name}
            {view === 'stats' && '📊 学习统计'}
          </h1>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {(['decks', 'stats'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v)
                if (v === 'decks') setSelectedDeckId(null)
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (view !== v) e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                if (view !== v) e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {v === 'decks' ? '卡组' : '统计'}
            </button>
          ))}
          <button
            onClick={() => setIsDark((d) => !d)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 16,
              marginLeft: 8,
              transition: 'all 0.2s',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px',
        }}
      >
        {view === 'decks' && <CardDeck decks={decks} onSelect={enterReview} />}
        {view === 'review' && selectedDeck && (
          <ReviewSession
            deck={selectedDeck}
            onReview={handleReviewResult}
          />
        )}
        {view === 'stats' && <StatsPanel stats={effectiveStats} />}
      </main>
    </div>
  )
}

export default App
