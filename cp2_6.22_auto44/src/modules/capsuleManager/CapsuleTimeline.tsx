import { useEffect, useState, useMemo } from 'react'
import { dataStore, type Capsule, type MoodType } from '../../shared/dataStore'

const MOOD_STYLES: Record<MoodType, { emoji: string; color: string }> = {
  happy: { emoji: '😊', color: '#FBBF24' },
  calm: { emoji: '😌', color: '#60A5FA' },
  sad: { emoji: '😢', color: '#818CF8' },
  angry: { emoji: '😠', color: '#F87171' },
  tired: { emoji: '😴', color: '#A78BFA' }
}

function getTimeUntil(targetDate: string): { days: number; hours: number; minutes: number; totalMs: number } {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  const days = Math.floor(absDiff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000))
  return { days, hours, minutes, totalMs: diff }
}

function formatCountdown(targetDate: string): { text: string; isDue: boolean; isUrgent: boolean } {
  const { days, hours, minutes, totalMs } = getTimeUntil(targetDate)
  const isDue = totalMs <= 0
  if (isDue) {
    const absDays = days
    if (absDays === 0) {
      return { text: '今日到期', isDue: true, isUrgent: true }
    }
    return { text: `已逾期 ${absDays} 天`, isDue: true, isUrgent: true }
  }
  if (days < 1) {
    return { text: `${hours}小时${minutes}分钟`, isDue: false, isUrgent: true }
  }
  return { text: `${days}天${hours}小时${minutes}分`, isDue: false, isUrgent: false }
}

interface CardProps {
  capsule: Capsule
  tick: number
}

function CapsuleCard({ capsule, tick }: CardProps) {
  void tick
  const { text: countdownText, isDue, isUrgent } = formatCountdown(capsule.targetDate)
  const mood = MOOD_STYLES[capsule.mood]

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
            <span style={{
              marginRight: 4,
              display: 'inline-block',
              animation: 'moodBreath 3s ease-in-out infinite',
              animationDelay: `${Math.random() * 3}s`
            }} className="mood-emoji">
              {mood.emoji}
            </span>
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
          animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
          fontSize: isDue ? 18 : 20
        }}>
          {countdownText}
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
        @keyframes moodBreath {
          0% { transform: scale(1); }
          25% { transform: scale(1.05); }
          50% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .capsule-card {
          transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
          transform-style: preserve-3d;
          perspective: 1000px;
          transform-origin: center center;
        }
        .capsule-card:hover {
          transform: translateY(-6px) rotateY(3deg);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
        .mood-emoji {
          animation-iteration-count: infinite;
          animation-delay: var(--mood-delay, 0s);
        }
      `}</style>
    </div>
  )
}

export function CapsuleTimeline() {
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setCapsules(dataStore.getAllCapsules())
    })
    setCapsules(dataStore.getAllCapsules())
    return unsub
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000)
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
            {columns[0].map((c) => <CapsuleCard key={c.id} capsule={c} tick={tick} />)}
          </div>
          <div style={styles.column}>
            {columns[1].map((c) => <CapsuleCard key={c.id} capsule={c} tick={tick} />)}
          </div>
          <div style={styles.column}>
            {columns[2].map((c) => <CapsuleCard key={c.id} capsule={c} tick={tick} />)}
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
