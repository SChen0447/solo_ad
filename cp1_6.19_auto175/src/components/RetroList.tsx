import { useState, useMemo } from 'react'
import type { Retrospective } from '../types'

interface Props {
  retros: Retrospective[]
  onSelect: (id: string) => void
}

const PAGE_SIZE = 10

export default function RetroList({ retros, onSelect }: Props) {
  const [page, setPage] = useState(1)

  const paginatedRetros = useMemo(() => {
    return retros.slice(0, page * PAGE_SIZE)
  }, [retros, page])

  const hasMore = paginatedRetros.length < retros.length

  const getAverageScore = (retro: Retrospective) => {
    if (retro.scores.length === 0) return null
    const sum = retro.scores.reduce((acc, s) => acc + s.score, 0)
    return (sum / retro.scores.length).toFixed(1)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#1dd1a1'
    if (score >= 6) return '#feca57'
    return '#e94560'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div>
      {retros.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '18px', color: '#a0a0a0', marginBottom: '8px' }}>
            暂无复盘记录
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            点击右上角或右下角按钮创建第一个复盘
          </p>
        </div>
      ) : (
        <>
          <div style={styles.grid} className="grid-2">
            {paginatedRetros.map((retro, index) => {
              const avgScore = getAverageScore(retro)
              return (
                <div
                  key={retro.id}
                  style={styles.card}
                  className={`card-hover ${index === 0 ? 'flip-in' : 'fade-in'}`}
                  onClick={() => onSelect(retro.id)}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={styles.projectName}>{retro.projectName}</h3>
                    {avgScore && (
                      <div
                        style={{
                          ...styles.scoreBadge,
                          backgroundColor: getScoreColor(parseFloat(avgScore)),
                        }}
                      >
                        {avgScore}
                      </div>
                    )}
                  </div>
                  <div style={styles.cardMeta}>
                    <span style={styles.date}>📅 {formatDate(retro.date)}</span>
                  </div>
                  <div style={styles.phases}>
                    {retro.phases.map((phase, i) => (
                      <span key={i} style={styles.phaseTag}>
                        {phase}
                      </span>
                    ))}
                  </div>
                  <div style={styles.cardFooter}>
                    <span style={styles.metaText}>
                      💭 {retro.reflections.length} 条反思
                    </span>
                    <span style={styles.metaText}>
                      ⭐ {retro.scores.length} 个评分
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div style={styles.loadMore}>
              <button
                style={styles.loadMoreBtn}
                className="btn-pulse"
                onClick={() => setPage(p => p + 1)}
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  empty: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  projectName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginRight: '16px',
    flex: 1,
  },
  scoreBadge: {
    minWidth: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '18px',
  },
  cardMeta: {
    marginBottom: '16px',
  },
  date: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  phases: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  phaseTag: {
    padding: '4px 12px',
    backgroundColor: '#0f3460',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#a0a0a0',
  },
  cardFooter: {
    display: 'flex',
    gap: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #0f3460',
  },
  metaText: {
    fontSize: '13px',
    color: '#666',
  },
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px',
  },
  loadMoreBtn: {
    padding: '12px 32px',
    backgroundColor: 'transparent',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    color: '#a0a0a0',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
}
