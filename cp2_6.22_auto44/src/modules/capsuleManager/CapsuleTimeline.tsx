import { useEffect, useState, useMemo } from 'react'
import { dataStore, type Capsule, type MoodType } from '../../shared/dataStore'

const MOOD_STYLES: Record<MoodType, { emoji: string; color: string }> = {
  happy: { emoji: '😊', color: '#FBBF24' },
  calm: { emoji: '😌', color: '#60A5FA' },
  sad: { emoji: '😢', color: '#818CF8' },
  angry: { emoji: '😠', color: '#F87171' },
  tired: { emoji: '😴', color: '#A78BFA' }
}

function getDaysUntil(targetDate: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(targetDate)
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.ceil((targetDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

interface CardProps {
  capsule: Capsule
}

function CapsuleCard({ capsule }: CardProps) {
  const days = getDaysUntil(capsule.targetDate)
  const isDue = days <= 0
  const mood = MOOD_STYLES[capsule.mood]
  const displayDays = isDue ? `已逾期 ${Math.abs(days)} 天` : `${days} 天后开启`

  return (
    <div style={styles.card} className="capsule-card">
      {capsule.imageUrl && (
        <img
          src={capsule.imageUrl}
          alt={capsule.title}
          style={styles.cardImage}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div style={styles.cardContent}>
        <div style={styles.cardHeader}>
          <span style={{
            ...styles.moodBadge,
            backgroundColor: mood.color + '20',
            color: mood.color,
            borderColor: mood.color + '40'
          }}>
            <span style={{ marginRight: 4 }}>{mood.emoji}</span>
          </span>
          <span style={styles.cardDate}>
            {new Date(capsule.targetDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h3 style={styles.cardTitle}>{capsule.title}</h3>
        <p style={styles.cardPreview}>{capsule.content.slice(0, 60)}{capsule.content.length > 60 ? '...' : ''}</p>
      </div>
      <div style={styles.cardFooter}>
        <span style={{
          ...styles.countdown,
          color: isDue ? '#DC2626' : '#7C3AED',
          animation: isDue ? 'pulse 1s ease-in-out infinite' : 'none'
        }}>
          {displayDays}
        </span>
        {capsule.isOpened && (
          <span style={styles.openedBadge}>已阅</span>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .capsule-card {
          transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
        }
        .capsule-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  )
}

export function CapsuleTimeline() {
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setCapsules(dataStore.getAllCapsules())
    })
    setCapsules(dataStore.getAllCapsules())
    return unsub
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const columns = useMemo(() => {
    const result: Capsule[][] = [[], [], []]
    capsules.forEach((c, i) => {
      result[i % 3].push(c)
    })
    return result
  }, [capsules])

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>时间线 · 所有胶囊</h2>
      {capsules.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <p style={{ color: '#9CA3AF', margin: 0 }}>还没有任何胶囊，创建第一颗吧</p>
        </div>
      ) : (
        <div style={styles.waterfall}>
          <div style={styles.column}>
            {columns[0].map((c) => <CapsuleCard key={c.id} capsule={c} />)}
          </div>
          <div style={styles.column}>
            {columns[1].map((c) => <CapsuleCard key={c.id} capsule={c} />)}
          </div>
          <div style={styles.column}>
            {columns[2].map((c) => <CapsuleCard key={c.id} capsule={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%'
  },
  header: {
    fontSize: 20,
    fontWeight: 700,
    color: '#F9FAFB',
    margin: '0 0 16px 0'
  },
  empty: {
    padding: 60,
    textAlign: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16
  },
  waterfall: {
    display: 'flex',
    gap: 16,
    width: '100%',
    '@media (max-width: 1023px)': {} as React.CSSProperties
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
    minWidth: 0
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    alignSelf: 'flex-start'
  },
  cardImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    display: 'block'
  },
  cardContent: {
    padding: '14px 16px 8px 16px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  moodBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    borderWidth: 1,
    borderStyle: 'solid'
  },
  cardDate: {
    fontSize: 12,
    color: '#6B7280'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 6px 0'
  },
  cardPreview: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.5,
    margin: 0
  },
  cardFooter: {
    padding: '10px 16px 14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  countdown: {
    fontSize: 20,
    fontWeight: 700
  },
  openedBadge: {
    fontSize: 12,
    color: '#10B981',
    backgroundColor: '#10B98120',
    padding: '3px 8px',
    borderRadius: 6,
    fontWeight: 500
  }
}
