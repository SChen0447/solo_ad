import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import type { Retrospective, Keyword } from '../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const ScoreChart = lazy(() => import('./ScoreChart'))
const WordCloud = lazy(() => import('./WordCloud'))

type Tab = 'overview' | 'reflections' | 'cloud'

interface Props {
  id: string
  onBack: () => void
  onUpdate: () => void
}

export default function RetroDetail({ id, onBack }: Props) {
  const [retro, setRetro] = useState<Retrospective | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [newReflection, setNewReflection] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [savingScores, setSavingScores] = useState<Record<string, boolean>>({})
  const [displayScore, setDisplayScore] = useState(0)

  const fetchRetro = useCallback(async () => {
    try {
      const res = await fetch(`/api/retrospectives/${id}`)
      const data = await res.json()
      setRetro(data)
    } catch (err) {
      console.error('Failed to fetch retrospective:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRetro()
  }, [fetchRetro])

  useEffect(() => {
    if (retro) {
      const avg = getAverageScore()
      animateScore(avg)
    }
  }, [retro?.scores])

  const animateScore = (target: number) => {
    let start = 0
    const duration = 1000
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(start + (target - start) * easeOut * 10) / 10)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch(`/api/retrospectives/${id}/keywords`)
      const data = await res.json()
      setKeywords(data)
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
    }
  }, [id])

  const getAverageScore = () => {
    if (!retro || retro.scores.length === 0) return 0
    const sum = retro.scores.reduce((acc, s) => acc + s.score, 0)
    return sum / retro.scores.length
  }

  const getStdDev = () => {
    if (!retro || retro.scores.length < 2) return 0
    const avg = getAverageScore()
    const squareDiffs = retro.scores.map(s => Math.pow(s.score - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    return Math.sqrt(avgSquareDiff)
  }

  const handleScoreChange = async (phase: string, score: number) => {
    setSavingScores(prev => ({ ...prev, [phase]: true }))
    try {
      const res = await fetch(`/api/retrospectives/${id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, score }),
      })
      if (res.ok) {
        await fetchRetro()
      }
    } catch (err) {
      console.error('Failed to save score:', err)
    } finally {
      setSavingScores(prev => ({ ...prev, [phase]: false }))
    }
  }

  const handleAddReflection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReflection.trim() || newReflection.length > 200) return

    try {
      const res = await fetch(`/api/retrospectives/${id}/reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newReflection.trim() }),
      })
      if (res.ok) {
        setNewReflection('')
        await fetchRetro()
      }
    } catch (err) {
      console.error('Failed to add reflection:', err)
    }
  }

  const handleDeleteReflection = async (reflectionId: string) => {
    try {
      const res = await fetch(`/api/retrospectives/${id}/reflections/${reflectionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchRetro()
      }
    } catch (err) {
      console.error('Failed to delete reflection:', err)
    }
  }

  const handleExport = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !retro) return

    const avgScore = getAverageScore()
    const reflectionsHtml = retro.reflections
      .slice(0, 5)
      .map(r => `<li style="margin: 8px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">${r.content}</li>`)
      .join('')

    const scoresHtml = retro.phases.map(phase => {
      const score = retro.scores.find(s => s.phase === phase)?.score || 0
      return `<div style="margin: 8px 0;"><strong>${phase}:</strong> ${score}/10</div>`
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>${retro.projectName} - 复盘报告</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 16px; }
            .meta { color: #666; margin: 16px 0; }
            .score-display { font-size: 48px; font-weight: bold; color: #e94560; text-align: center; margin: 24px 0; }
            .section { margin: 24px 0; }
            .section h2 { color: #0f3460; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <h1>${retro.projectName} 复盘报告</h1>
          <div class="meta">
            <p>日期：${retro.date}</p>
            <p>反思总数：${retro.reflections.length} 条</p>
          </div>
          <div class="score-display">总评分：${avgScore.toFixed(1)}/10</div>
          <div class="section">
            <h2>阶段评分</h2>
            ${scoresHtml}
          </div>
          <div class="section">
            <h2>反思摘要</h2>
            <ul style="list-style: none; padding: 0;">
              ${reflectionsHtml}
            </ul>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const getRelativeTime = (dateStr: string) => {
    return dayjs(dateStr).fromNow()
  }

  const getPhaseScore = (phase: string) => {
    return retro?.scores.find(s => s.phase === phase)?.score || 0
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#1dd1a1'
    if (score >= 6) return '#feca57'
    return '#e94560'
  }

  const CircularProgress = ({ value, max }: { value: number; max: number }) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const progress = (value / max) * circumference
    const offset = circumference - progress

    return (
      <svg width="120" height="120" className="circular-progress">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#0f3460"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e94560"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dy=".3em"
          fill="#e0e0e0"
          fontSize="24"
          fontWeight="bold"
          transform="rotate(90 60 60)"
        >
          <tspan className="number-scroll">{displayScore}</tspan>
        </text>
      </svg>
    )
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={{ ...styles.spinner }}></div>
      </div>
    )
  }

  if (!retro) {
    return <div style={styles.error}>复盘记录不存在</div>
  }

  const avgScore = getAverageScore()
  const stdDev = getStdDev()

  return (
    <div style={styles.container}>
      <div style={styles.header} className="no-print">
        <div>
          <button
            style={styles.backBtn}
            className="btn-pulse"
            onClick={onBack}
          >
            ← 返回列表
          </button>
          <h1 style={styles.title}>{retro.projectName}</h1>
          <p style={styles.date}>📅 {retro.date}</p>
        </div>
        <button
          style={styles.exportBtn}
          className="btn-pulse"
          onClick={handleExport}
        >
          📄 导出报告
        </button>
      </div>

      <div style={styles.tabs} className="no-print">
        {[
          { key: 'overview' as Tab, label: '📊 概览' },
          { key: 'reflections' as Tab, label: '💭 反思' },
          { key: 'cloud' as Tab, label: '☁️ 词云' },
        ].map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.key ? styles.tabBtnActive : {}),
            }}
            className="btn-pulse"
            onClick={() => {
              setActiveTab(tab.key)
              if (tab.key === 'cloud') {
                fetchKeywords()
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div key={activeTab} className="tab-enter">
          {activeTab === 'overview' && (
            <div>
              <div style={styles.scoreSection}>
                <div style={styles.scoreDisplay}>
                  <CircularProgress value={avgScore} max={10} />
                  <p style={styles.scoreLabel}>总平均分</p>
                </div>
                <div style={styles.stats}>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>标准差</span>
                    <span style={{ ...styles.statValue, color: '#feca57' }}>
                      {stdDev.toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statLabel}>已评分</span>
                    <span style={styles.statValue}>
                      {retro.scores.length} / {retro.phases.length}
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.chartContainer}>
                <h3 style={styles.sectionTitle}>评分趋势</h3>
                <Suspense fallback={<div style={styles.chartLoading}>加载图表中...</div>}>
                  <ScoreChart retro={retro} />
                </Suspense>
              </div>

              <div style={styles.slidersContainer}>
                <h3 style={styles.sectionTitle}>阶段评分</h3>
                {retro.phases.map((phase, index) => {
                  const score = getPhaseScore(phase)
                  return (
                    <div key={phase} style={styles.sliderItem}>
                      <div style={styles.sliderHeader}>
                        <span style={styles.phaseName}>
                          {index + 1}. {phase}
                        </span>
                        <span
                          style={{
                            ...styles.phaseScore,
                            color: getScoreColor(score),
                          }}
                        >
                          {score || '-'}/10
                          {savingScores[phase] && ' (保存中...)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={score || 1}
                        onChange={e => {
                          const newScore = parseInt(e.target.value)
                          handleScoreChange(phase, newScore)
                        }}
                        className="gradient-slider"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'reflections' && (
            <div>
              <form onSubmit={handleAddReflection} style={styles.reflectionForm}>
                <textarea
                  value={newReflection}
                  onChange={e => setNewReflection(e.target.value)}
                  style={styles.textarea}
                  placeholder="记录你的反思（最多200字）"
                  maxLength={200}
                  rows={3}
                />
                <div style={styles.formActions}>
                  <span style={styles.charCount}>
                    {newReflection.length}/200
                  </span>
                  <button
                    type="submit"
                    style={styles.submitBtn}
                    className="btn-pulse"
                    disabled={!newReflection.trim()}
                  >
                    提交反思
                  </button>
                </div>
              </form>

              <div style={styles.reflectionsList}>
                {retro.reflections.length === 0 ? (
                  <div style={styles.emptyReflections}>
                    暂无反思记录，快来添加第一条吧！
                  </div>
                ) : (
                  retro.reflections
                    .slice()
                    .reverse()
                    .map((reflection, index) => (
                      <div
                        key={reflection.id}
                        className="reflection-card fade-in"
                        style={{
                          ...styles.reflectionCard,
                          animationDelay: `${index * 0.05}s`,
                        }}
                      >
                        <div style={styles.reflectionContent}>
                          <p style={styles.reflectionText}>{reflection.content}</p>
                        </div>
                        <div style={styles.reflectionMeta}>
                          <span style={styles.timestamp}>
                            {getRelativeTime(reflection.createdAt)}
                          </span>
                          <button
                            style={styles.deleteBtn}
                            className="btn-pulse"
                            onClick={() => handleDeleteReflection(reflection.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div style={styles.cloudContainer}>
              <h3 style={styles.sectionTitle}>关键词云</h3>
              <Suspense fallback={<div style={styles.chartLoading}>加载词云中...</div>}>
                <WordCloud keywords={keywords} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#a0a0a0',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
    padding: '4px 0',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: '8px',
  },
  date: {
    fontSize: '16px',
    color: '#a0a0a0',
  },
  exportBtn: {
    padding: '12px 24px',
    backgroundColor: '#0f3460',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    borderBottom: '1px solid #0f3460',
  },
  tabBtn: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    color: '#a0a0a0',
    fontSize: '14px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    color: '#e94560',
    borderBottomColor: '#e94560',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '48px',
    marginBottom: '32px',
    padding: '32px',
    backgroundColor: '#16213e',
    borderRadius: '16px',
  },
  scoreDisplay: {
    textAlign: 'center' as const,
  },
  scoreLabel: {
    marginTop: '8px',
    color: '#a0a0a0',
    fontSize: '14px',
  },
  stats: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
  },
  statLabel: {
    color: '#a0a0a0',
    fontSize: '14px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  chartContainer: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
  },
  slidersContainer: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '24px',
  },
  sliderItem: {
    marginBottom: '24px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  phaseName: {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: 500,
  },
  phaseScore: {
    fontSize: '18px',
    fontWeight: 600,
  },
  reflectionForm: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    resize: 'none' as const,
    fontFamily: 'inherit',
    marginBottom: '12px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
  },
  submitBtn: {
    padding: '10px 24px',
    backgroundColor: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  reflectionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  emptyReflections: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
    backgroundColor: '#16213e',
    borderRadius: '16px',
  },
  reflectionCard: {
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    border: '1px solid rgba(79, 195, 247, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  reflectionContent: {
    flex: 1,
  },
  reflectionText: {
    color: '#e0e0e0',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  reflectionMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '8px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  cloudContainer: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '32px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #16213e',
    borderTop: '3px solid #e94560',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#e94560',
  },
  chartLoading: {
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
}
