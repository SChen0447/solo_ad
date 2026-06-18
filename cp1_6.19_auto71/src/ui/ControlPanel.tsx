import { useGameStore } from '../store/gameStore'

interface ControlPanelProps {
  onBack: () => void
  onRetry: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ControlPanel({ onBack, onRetry }: ControlPanelProps) {
  const {
    selectedSong,
    currentTime,
    scoreState,
    phase,
    pauseGame,
    resumeGame,
  } = useGameStore()

  if (!selectedSong) return null

  const progress = Math.min(100, (currentTime / selectedSong.duration) * 100)
  const remainingTime = Math.max(0, selectedSong.duration - currentTime)

  const isPaused = phase === 'paused'
  const isPlaying = phase === 'playing'

  const togglePause = () => {
    if (isPaused) {
      resumeGame()
    } else if (isPlaying) {
      pauseGame()
    }
  }

  const hearts = []
  for (let i = 0; i < scoreState.maxLives; i++) {
    hearts.push(
      <span
        key={i}
        className={`heart ${i < scoreState.lives ? 'active' : 'inactive'}`}
      >
        ♥
      </span>
    )
  }

  return (
    <div className="control-panel">
      <div className="panel-top">
        <div className="song-info">
          <h2 className="song-name">{selectedSong.name}</h2>
          <span className="song-style">
            {selectedSong.style === 'electronic' ? '电子' : selectedSong.style === 'classical' ? '古典' : '爵士'}
            {' · '}{selectedSong.bpm} BPM
          </span>
        </div>
        <div className="lives-display">
          {hearts}
          <span className="lives-count">{scoreState.lives}</span>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span className="remaining-time">-{formatTime(remainingTime)}</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="score-display">
          <span className="stat-label">得分</span>
          <span className="stat-value score-value">{scoreState.score.toLocaleString()}</span>
        </div>
        <div className="combo-display">
          <span className="stat-label">连击</span>
          <span className="stat-value combo-value">
            {scoreState.combo > 0 ? `${scoreState.combo}x` : '—'}
          </span>
        </div>
      </div>

      <div className="controls-row">
        <button
          className="control-btn back-btn"
          onClick={onBack}
        >
          ← 返回选曲
        </button>

        <button
          className={`control-btn play-pause-btn ${isPaused ? 'resume' : ''}`}
          onClick={togglePause}
          disabled={phase === 'idle' || phase === 'ended'}
        >
          {isPaused ? '▶ 继续' : isPlaying ? '⏸ 暂停' : '▶ 开始'}
        </button>

        <button
          className="control-btn retry-btn"
          onClick={onRetry}
        >
          ↻ 重试
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
