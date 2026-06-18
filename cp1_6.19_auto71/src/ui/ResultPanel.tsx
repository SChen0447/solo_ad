import { useGameStore } from '../store/gameStore'

interface ResultPanelProps {
  onRetry: () => void
  onBack: () => void
}

function ResultPanel({ onRetry, onBack }: ResultPanelProps) {
  const { scoreState, selectedSong, beatMap } = useGameStore()

  const stats = beatMap?.getStats() || {
    total: 0,
    hit: 0,
    perfect: 0,
    missed: 0,
  }

  const totalActions = stats.hit + stats.missed
  const accuracy = totalActions > 0 ? (stats.hit / totalActions) * 100 : 0
  const perfectRate = totalActions > 0 ? (stats.perfect / totalActions) * 100 : 0
  const missRate = totalActions > 0 ? (stats.missed / totalActions) * 100 : 0

  const getGrade = () => {
    if (accuracy >= 95 && perfectRate >= 60) return { grade: 'S', color: '#ffd700' }
    if (accuracy >= 90) return { grade: 'A', color: '#1dd1a1' }
    if (accuracy >= 80) return { grade: 'B', color: '#48dbfb' }
    if (accuracy >= 70) return { grade: 'C', color: '#feca57' }
    if (accuracy >= 60) return { grade: 'D', color: '#ff9ff3' }
    return { grade: 'F', color: '#ff6b6b' }
  }

  const gradeInfo = getGrade()
  const isClear = scoreState.lives > 0

  return (
    <div className="result-overlay">
      <div className="result-panel">
        <div className="result-header">
          <h2 className="result-title">
            {isClear ? '🎉 演奏完成！' : '💔 游戏结束'}
          </h2>
          {selectedSong && (
            <p className="result-song">{selectedSong.name}</p>
          )}
        </div>

        <div className="grade-section">
          <div
            className="grade-display"
            style={{ color: gradeInfo.color, textShadow: `0 0 30px ${gradeInfo.color}60` }}
          >
            {gradeInfo.grade}
          </div>
        </div>

        <div className="result-score">
          <span className="score-label">最终得分</span>
          <span className="score-number">{scoreState.score.toLocaleString()}</span>
        </div>

        <div className="result-stats-grid">
          <div className="stat-item perfect">
            <span className="stat-item-label">精准命中</span>
            <span className="stat-item-value">{stats.perfect}</span>
            <span className="stat-item-percent">{perfectRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item hit">
            <span className="stat-item-label">命中</span>
            <span className="stat-item-value">{stats.hit}</span>
            <span className="stat-item-percent">{accuracy.toFixed(1)}%</span>
          </div>
          <div className="stat-item miss">
            <span className="stat-item-label">失误</span>
            <span className="stat-item-value">{stats.missed}</span>
            <span className="stat-item-percent">{missRate.toFixed(1)}%</span>
          </div>
          <div className="stat-item combo">
            <span className="stat-item-label">最大连击</span>
            <span className="stat-item-value">{scoreState.maxCombo}x</span>
            <span className="stat-item-percent">COMBO</span>
          </div>
        </div>

        <div className="accuracy-bar-wrapper">
          <div className="accuracy-label">
            <span>命中率</span>
            <span>{accuracy.toFixed(1)}%</span>
          </div>
          <div className="accuracy-bar">
            <div
              className="accuracy-fill perfect-fill"
              style={{ width: `${perfectRate}%` }}
            />
            <div
              className="accuracy-fill hit-fill"
              style={{ width: `${accuracy - perfectRate}%`, left: `${perfectRate}%` }}
            />
          </div>
        </div>

        <div className="result-actions">
          <button className="result-btn back-btn" onClick={onBack}>
            ← 返回选曲
          </button>
          <button className="result-btn retry-btn" onClick={onRetry}>
            ↻ 再来一次
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultPanel
