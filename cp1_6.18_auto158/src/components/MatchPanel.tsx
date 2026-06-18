import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'

export function MatchPanel() {
  const fragments = useAppStore((s) => s.fragments)
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId)
  const matchResults = useAppStore((s) => s.matchResults)
  const config = useAppStore((s) => s.config)
  const panelExpanded = useAppStore((s) => s.panelExpanded.matchPanel)
  const setPanelExpanded = useAppStore((s) => s.setPanelExpanded)

  const [animatedScores, setAnimatedScores] = useState<Map<string, number>>(
    new Map()
  )

  const selectedFragment = fragments.find((f) => f.id === selectedFragmentId)

  const otherFragments = fragments.filter((f) => f.id !== selectedFragmentId)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScores((prev) => {
        const next = new Map(prev)
        otherFragments.forEach((f) => {
          const key = [selectedFragmentId, f.id].filter(Boolean).sort().join('|')
          if (!key) return
          const match = matchResults.get(key)
          const targetScore = match?.score ?? 0
          const currentScore = prev.get(key) ?? 0
          const diff = targetScore - currentScore
          if (Math.abs(diff) > 0.5) {
            next.set(key, currentScore + diff * 0.15)
          } else {
            next.set(key, targetScore)
          }
        })
        return next
      })
    }, 16)

    return () => clearInterval(interval)
  }, [otherFragments, selectedFragmentId, matchResults])

  const getScoreColor = (score: number): string => {
    if (score > 80) return '#44ff88'
    if (score >= 50) return '#ffcc44'
    return '#ff4444'
  }

  const getScoreLabel = (score: number): string => {
    if (score > 80) return '高度匹配'
    if (score >= 50) return '部分匹配'
    return '匹配度低'
  }

  const getDistance = (otherId: string): number | null => {
    if (!selectedFragment) return null
    const other = fragments.find((f) => f.id === otherId)
    if (!other) return null
    return selectedFragment.position.distanceTo(other.position)
  }

  return (
    <div className="panel" style={{ marginBottom: '12px' }}>
      <div
        className="panel-header"
        onClick={() => setPanelExpanded('matchPanel', !panelExpanded)}
      >
        <span className="panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
          </svg>
          匹配度监控
        </span>
        <svg
          className={`chevron ${panelExpanded ? 'expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </div>

      <div
        className={`panel-content ${panelExpanded ? 'expanded' : ''}`}
        style={{ maxHeight: panelExpanded ? '350px' : '0px' }}
      >
        {!selectedFragment ? (
          <div className="match-panel-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <p>请先选择一个碎片</p>
            <p className="hint">选中后将显示与其他碎片的匹配度</p>
          </div>
        ) : otherFragments.length === 0 ? (
          <div className="match-panel-empty">
            <p>暂无其他碎片可对比</p>
          </div>
        ) : (
          <div className="match-list">
            {otherFragments.map((frag) => {
              const key = [selectedFragmentId, frag.id].sort().join('|')
              const match = matchResults.get(key)
              const rawScore = match?.score ?? 0
              const displayScore = Math.round(animatedScores.get(key) ?? 0)
              const distance = getDistance(frag.id)
              const inRange =
                distance !== null && distance < config.matchThreshold + 2
              const color = getScoreColor(displayScore)

              return (
                <div key={frag.id} className="match-item">
                  <div className="match-item-header">
                    <span className="match-fragment-name" title={frag.name}>
                      {frag.name}
                    </span>
                    <span
                      className="match-score-value"
                      style={{
                        color,
                        textShadow: inRange ? `0 0 8px ${color}60` : 'none'
                      }}
                    >
                      {displayScore}%
                    </span>
                  </div>

                  <div className="match-bar-container">
                    <div
                      className="match-bar-background"
                      style={{
                        background: `linear-gradient(90deg, 
                          ${color}20 0%, 
                          ${color}40 50%, 
                          ${color}60 100%)`
                      }}
                    >
                      <div
                        className="match-bar-fill"
                        style={{
                          width: `${displayScore}%`,
                          background: `linear-gradient(90deg, ${color}80, ${color})`,
                          boxShadow: inRange
                            ? `0 0 10px ${color}80, inset 0 0 5px ${color}40`
                            : 'none',
                          transition: 'width 0.2s ease-out'
                        }}
                      >
                        {inRange && (
                          <div
                            className="match-bar-glow"
                            style={{ background: color }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="match-item-footer">
                    <span
                      className={`match-status ${inRange ? 'active' : ''}`}
                      style={{ color: inRange ? color : '#666' }}
                    >
                      {getScoreLabel(displayScore)}
                    </span>
                    {distance !== null && (
                      <span className="match-distance">
                        距离: {distance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="match-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#44ff88' }}
            />
            <span>优秀 (80%+)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#ffcc44' }}
            />
            <span>良好 (50-80%)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: '#ff4444' }}
            />
            <span>较低 (＜50%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
