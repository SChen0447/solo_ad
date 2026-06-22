import { useEffect, useState } from 'react'
import { CapsuleCreator } from './modules/capsuleManager/CapsuleCreator'
import { CapsuleTimeline } from './modules/capsuleManager/CapsuleTimeline'
import { ReminderPopup } from './modules/reminderEngine/ReminderPopup'
import { reminderChecker } from './modules/reminderEngine/ReminderChecker'
import { dataStore, type Capsule, type MoodType } from './shared/dataStore'

const MOOD_INFO: Record<MoodType, { emoji: string; color: string }> = {
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

function Sidebar() {
  const [recentCapsules, setRecentCapsules] = useState<Capsule[]>([])

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecentCapsules(dataStore.getRecentCapsules(5))
    })
    setRecentCapsules(dataStore.getRecentCapsules(5))
    return unsub
  }, [])

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <span style={styles.sidebarIcon}>⏳</span>
        <span style={styles.sidebarTitle}>时间胶囊</span>
      </div>

      <div style={styles.sidebarSection}>
        <h3 style={styles.sidebarSectionTitle}>最近封存</h3>
        {recentCapsules.length === 0 ? (
          <p style={styles.sidebarEmpty}>暂无胶囊</p>
        ) : (
          <div style={styles.recentList}>
            {recentCapsules.map((c) => {
              const days = getDaysUntil(c.targetDate)
              const isDue = days <= 0
              const mood = MOOD_INFO[c.mood]
              return (
                <div key={c.id} style={styles.recentItem}>
                  <div style={styles.recentItemTop}>
                    <span style={{
                      ...styles.recentMood,
                      backgroundColor: mood.color + '20',
                      color: mood.color
                    }}>
                      {mood.emoji}
                    </span>
                    <span style={{
                      ...styles.recentDays,
                      color: isDue ? '#DC2626' : '#7C3AED'
                    }}>
                      {isDue ? '已到期' : `${days}天`}
                    </span>
                  </div>
                  <div style={styles.recentTitle}>{c.title}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={styles.sidebarFooter}>
        <p style={styles.sidebarFooterText}>
          每一颗胶囊，都是写给未来的情书
        </p>
      </div>
    </aside>
  )
}

function App() {
  useEffect(() => {
    reminderChecker.start()
    return () => reminderChecker.stop()
  }, [])

  return (
    <div style={styles.app}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.mainInner}>
          <CapsuleCreator />
          <CapsuleTimeline />
        </div>
      </main>
      <ReminderPopup />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#111827'
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    backgroundColor: '#1F2937',
    borderRight: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    '@media (max-width: 767px)': {
      display: 'none'
    }
  },
  sidebarHeader: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid #374151'
  },
  sidebarIcon: {
    fontSize: 24
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#F9FAFB'
  },
  sidebarSection: {
    padding: '20px 16px',
    flex: 1,
    overflowY: 'auto'
  },
  sidebarSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  sidebarEmpty: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  recentItem: {
    padding: '10px 12px',
    backgroundColor: '#111827',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  recentItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  recentMood: {
    fontSize: 16,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  recentDays: {
    fontSize: 12,
    fontWeight: 700
  },
  recentTitle: {
    fontSize: 13,
    color: '#D1D5DB',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #374151'
  },
  sidebarFooterText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 1.5,
    fontStyle: 'italic'
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowY: 'auto'
  },
  mainInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px'
  }
}

export default App
